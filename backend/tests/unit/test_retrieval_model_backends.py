"""Provider contracts: no credentials, downloads or external service calls."""
import builtins
import json
from types import SimpleNamespace
from unittest.mock import Mock

import httpx
import networkx as nx
import numpy as np
import pytest

from app.config import Settings
from app.core.indexer.embedder import CodeEmbedder
from app.core.indexer.qdrant_store import QdrantCodeStore
from app.core.llm.errors import ModelConfigurationError, ModelRequestError
from app.core.models.common import JsonEndpoint, embedding_fingerprint, validate_ranking
from app.core.models.embeddings import ApiEmbeddings, GeminiEmbeddings, create_embedding_backend
from app.core.models.ranking import ApiRanking, GeminiRanking, create_ranking_backend
from app.core.retrieval.reranker import CrossEncoderReranker


@pytest.fixture
def settings(tmp_path):
    return Settings(_env_file=None, database_url="postgresql+asyncpg://test:test@localhost/db",
                    gemini_api_key="test-only", embedding_cache_path=str(tmp_path / "cache"),
                    retrieval_model_retry_delay_seconds=0)


def use_http(endpoint, handler):
    endpoint.client = httpx.Client(base_url=endpoint.base_url, transport=httpx.MockTransport(handler))


def test_cloud_startup_never_imports_local_models(settings, monkeypatch):
    original = builtins.__import__
    def guarded(name, *args, **kwargs):
        assert name.split('.')[0] not in {"torch", "transformers", "sentence_transformers"}
        return original(name, *args, **kwargs)
    monkeypatch.setattr(builtins, "__import__", guarded)
    embedder, reranker = CodeEmbedder(settings=settings), CrossEncoderReranker(settings=settings)
    assert isinstance(embedder.backend, GeminiEmbeddings)
    assert isinstance(reranker.backend, GeminiRanking)
    assert "client" not in embedder.backend.__dict__


def test_batch_modes_normalization_dimensions(settings):
    settings.embed_batch_size = 2
    backend = Mock()
    backend.encode.side_effect = lambda texts, query: [[3, 4] for _ in texts]
    model = CodeEmbedder(settings=settings, backend=backend)
    assert model.embed_batch(["a", "b", "c"]).shape == (3, 2)
    np.testing.assert_allclose(model.embed_text("q"), [0.6, 0.8])
    assert [c.kwargs["query"] for c in backend.encode.call_args_list] == [False, False, True]
    assert model.dimension == 2
    assert model.embed_batch([]).shape == (0, 2)


@pytest.mark.parametrize("vectors", [[[0, 0]], [[float('nan'), 1]], [[float('inf'), 1]], [[1, 2], [3, 4]], [1, 2]])
def test_bad_embedding_results(settings, vectors):
    with pytest.raises(ModelRequestError):
        CodeEmbedder(settings=settings, backend=SimpleNamespace(encode=lambda *a, **k: vectors)).embed_text("q")


def test_dimension_mismatch(settings):
    settings.embed_dimensions = 3
    model = CodeEmbedder(settings=settings, backend=SimpleNamespace(encode=lambda *a, **k: [[1, 2]]))
    with pytest.raises(ModelRequestError, match="dimension"):
        model.embed_text("query")


def test_prefix_and_document_cache(settings):
    settings.embed_query_prefix, settings.embed_document_prefix = "Q: ", "D: "
    backend = Mock()
    backend.encode.side_effect = lambda texts, query: [[1, 2] for text in texts]
    model, unit = CodeEmbedder(settings=settings, backend=backend), SimpleNamespace(id="f")
    model.embed_with_cache(unit, "graph v1")
    model.embed_with_cache(unit, "graph v1")
    model.embed_with_cache(unit, "graph v2")
    model.embed_text("question")
    assert backend.encode.call_count == 3
    assert backend.encode.call_args_list[0].args[0] == ["D: graph v1"]
    assert backend.encode.call_args_list[0].kwargs == {"query": False}
    assert backend.encode.call_args_list[-1].args[0] == ["Q: question"]
    changed = settings.model_copy(update={"embed_model": "other"})
    assert model.make_cache_key("f", "same") != CodeEmbedder(settings=changed).make_cache_key("f", "same")
    model.cache.close()


def test_voyage_embedding_order_payload(settings):
    settings.embed_provider, settings.embed_model = "voyage", "configurable-model"
    settings.voyage_api_key, settings.embed_dimensions = "test-voyage", 2
    backend = ApiEmbeddings(settings)
    def handle(request):
        assert str(request.url) == settings.voyage_base_url + "/embeddings"
        body = json.loads(request.content)
        assert body["model"] == settings.embed_model
        assert body["input_type"] == "query" and body["output_dimension"] == 2
        assert body["truncation"] is False
        return httpx.Response(200, json={"data": [
            {"index": 1, "embedding": [0, 1]}, {"index": 0, "embedding": [1, 0]}]})
    use_http(backend.endpoint, handle)
    assert backend.encode(["a", "b"], query=True) == [[1, 0], [0, 1]]


def test_self_hosted_embedding_endpoint(settings):
    settings.embed_provider, settings.embed_model = "openai_compatible", "my-local-model"
    settings.embed_base_url = "http://localhost:8001/v1"
    backend = ApiEmbeddings(settings)
    def handle(request):
        assert "Authorization" not in request.headers
        assert json.loads(request.content) == {"model": "my-local-model", "input": ["code"], "encoding_format": "float"}
        return httpx.Response(200, json={"data": [{"index": 0, "embedding": [1, 2, 3]}]})
    use_http(backend.endpoint, handle)
    assert backend.encode(["code"], query=False) == [[1, 2, 3]]


def test_duplicate_embedding_indices(settings):
    settings.embed_provider, settings.embed_base_url = "openai_compatible", "http://localhost/v1"
    backend = ApiEmbeddings(settings)
    use_http(backend.endpoint, lambda r: httpx.Response(200, json={"data": [
        {"index": 0, "embedding": [1]}, {"index": 0, "embedding": [2]}]}))
    with pytest.raises(ModelRequestError, match="indices"):
        backend.encode(["a", "b"], query=False)


def test_gemini_embedding_config_and_errors(settings):
    settings.embed_dimensions, settings.embed_query_task = 2, "RETRIEVAL_QUERY"
    backend = GeminiEmbeddings(settings)
    backend.client = Mock()
    backend.client.models.embed_content.return_value = SimpleNamespace(embeddings=[SimpleNamespace(values=[1, 2])])
    assert backend.encode(["question"], query=True) == [[1, 2]]
    args = backend.client.models.embed_content.call_args.kwargs
    assert args["model"] == settings.embed_model and args["config"].output_dimensionality == 2
    assert args["config"].task_type == "RETRIEVAL_QUERY"
    backend.client.models.embed_content.side_effect = httpx.ConnectError("secret-source-key")
    with pytest.raises(ModelRequestError) as exc:
        backend.encode(["question"], query=True)
    assert "secret-source-key" not in str(exc.value)


def test_missing_key_and_unknown_provider_no_fallback(settings):
    with pytest.raises(ModelConfigurationError, match="Unsupported"):
        create_embedding_backend(settings.model_copy(update={"embed_provider": "unknown"}))
    with pytest.raises(ModelConfigurationError, match="Unsupported"):
        create_ranking_backend(settings.model_copy(update={"rerank_provider": "unknown"}))
    settings.gemini_api_key = None
    with pytest.raises(ModelConfigurationError, match="API_KEY"):
        CodeEmbedder(settings=settings).embed_text("q")


def test_http_retries_transient_only(settings):
    endpoint, calls = JsonEndpoint(settings, "http://localhost/v1"), []
    def transient(request):
        calls.append(request)
        return httpx.Response(429 if len(calls) == 1 else 200, json={"ok": True})
    use_http(endpoint, transient)
    assert endpoint.post("embeddings", {}) == {"ok": True} and len(calls) == 2
    calls.clear()
    def permanent(request):
        calls.append(request)
        return httpx.Response(401, text="secret data")
    use_http(endpoint, permanent)
    with pytest.raises(ModelRequestError, match="401") as exc:
        endpoint.post("embeddings", {})
    assert len(calls) == 1 and "secret data" not in str(exc.value)


def test_exhausted_retries(settings):
    settings.retrieval_model_attempts = 2
    endpoint, calls = JsonEndpoint(settings, "http://localhost/v1"), []
    use_http(endpoint, lambda request: (calls.append(request) or httpx.Response(503)))
    with pytest.raises(ModelRequestError, match="503"):
        endpoint.post("rerank", {})
    assert len(calls) == 2


@pytest.mark.parametrize("provider,field,result_key", [("voyage", "top_k", "data"), ("cohere", "top_n", "results"), ("http", "top_n", "results")])
def test_remote_reranker_contract(settings, provider, field, result_key):
    settings.rerank_provider, settings.rerank_model = provider, "selected-reranker"
    settings.rerank_base_url, settings.rerank_api_key = "http://localhost/v1", "test"
    backend = ApiRanking(settings)
    def handle(request):
        assert json.loads(request.content)[field] == 2
        return httpx.Response(200, json={result_key: [
            {"index": 1, "relevance_score": 0.9}, {"index": 0, "relevance_score": 0.1}]})
    use_http(backend.endpoint, handle)
    assert backend.rank("q", ["a", "b"]) == [(1, 0.9), (0, 0.1)]


@pytest.mark.parametrize("rows", [[], [{"index": 0, "relevance_score": float("nan")}],
    [{"index": True, "relevance_score": 1}], [{"index": 1, "relevance_score": 1}],
    [{"index": 0, "relevance_score": "1"}]])
def test_invalid_ranking(rows):
    with pytest.raises(ModelRequestError):
        validate_ranking(rows, 1)


def test_gemini_structured_ranking(settings):
    backend = GeminiRanking(settings)
    backend.client = Mock()
    backend.client.models.generate_content.return_value = SimpleNamespace(
        text=json.dumps({"results": [{"index": 0, "relevance_score": 0.7}]}), candidates=[])
    assert backend.rank("q", ["code"]) == [(0, 0.7)]
    args = backend.client.models.generate_content.call_args.kwargs
    assert args["model"] == settings.rerank_model and args["config"].response_mime_type == "application/json"
    backend.client.models.generate_content.return_value.text = '{"results": []}'
    with pytest.raises(ModelRequestError):
        backend.rank("q", ["code"])


def test_ranking_batches_empty_dedup_disabled(settings):
    settings.rerank_batch_size = 2
    graph = nx.MultiDiGraph()
    graph.add_nodes_from(["a", "b", "c"])
    backend = Mock()
    backend.rank.side_effect = [[(0, 0.2), (1, 0.8)], [(0, 0.5)]]
    reranker = CrossEncoderReranker(settings=settings, backend=backend)
    assert reranker.rerank("q", ["missing"], graph) == []
    assert reranker.rerank("q", ["a", "b", "a", "c"], graph) == [("b", 0.8), ("c", 0.5), ("a", 0.2)]
    assert backend.rank.call_count == 2
    settings.rerank_provider = "none"
    disabled = CrossEncoderReranker(settings=settings)
    assert [node for node, _ in disabled.rerank("q", ["c", "b", "a"], graph)] == ["c", "b", "a"]
    assert "backend" not in disabled.__dict__


def unit():
    return SimpleNamespace(id="file.py::f", name="f", qualified_name="f", filepath="file.py",
        start_line=1, end_line=2, node_type="function", is_test=False, source="def f(): pass", docstring="")


def test_qdrant_dynamic_dimensions_and_model_isolation(settings):
    store = QdrantCodeStore(url=":memory:", settings=settings)
    store.upsert_units([unit()], [[1, 0, 0]])
    assert store.search([1, 0, 0])[0].payload["func_id"] == unit().id
    with pytest.raises(ValueError, match="dimension"):
        store.search([1, 0])
    other = QdrantCodeStore(url=":memory:", settings=settings.model_copy(update={"embed_model": "another-model"}))
    other.client = store.client
    assert other.collection_name != store.collection_name
    with pytest.raises(ValueError, match="Reindex"):
        other.search([1, 0, 0])
    assert store.search([1, 0, 0])
    store.client.close()


def test_bad_recreate_preserves_index(settings):
    store = QdrantCodeStore(url=":memory:", settings=settings)
    store.upsert_units([unit()], [[1, 0]])
    with pytest.raises(ValueError):
        store.recreate_collection(vector_size=-1)
    assert store.search([1, 0])
    with pytest.raises(ValueError):
        store.upsert_units([unit()], [[1, 0], [0, 1]])
    assert store.search([1, 0])
    store.client.close()


def test_fingerprint_includes_preprocessing_not_key(settings):
    original = embedding_fingerprint(settings)
    assert original == embedding_fingerprint(settings.model_copy(update={"gemini_api_key": "rotated"}))
    assert original != embedding_fingerprint(settings.model_copy(update={"embed_query_prefix": "query: "}))
    assert original != embedding_fingerprint(settings.model_copy(update={"embed_dimensions": 100}))


def test_gemini_real_sdk_preserves_document_boundaries(settings):
    from google import genai
    from google.genai import types
    def handle(request):
        assert settings.embed_model in request.url.path
        body = json.loads(request.content)
        assert len(body["requests"]) == 2
        assert [item["content"]["parts"][0]["text"] for item in body["requests"]] == ["first function", "second function"]
        return httpx.Response(200, json={"embeddings": [{"values": [1, 0]}, {"values": [0, 1]}]})
    backend = GeminiEmbeddings(settings)
    backend.client = genai.Client(api_key="test-key", vertexai=False, http_options=types.HttpOptions(
        httpx_client=httpx.Client(transport=httpx.MockTransport(handle)),
        retry_options=types.HttpRetryOptions(attempts=1)))
    assert backend.encode(["first function", "second function"], query=False) == [[1, 0], [0, 1]]
    backend.client.close()


def test_gemini_real_sdk_ranking_contract(settings):
    from google import genai
    from google.genai import types
    def handle(request):
        assert settings.rerank_model in request.url.path
        body = json.loads(request.content)
        content = json.loads(body["contents"][0]["parts"][0]["text"])
        assert content["documents"] == [{"index": 0, "text": "code"}]
        assert body["generationConfig"]["responseMimeType"] == "application/json"
        return httpx.Response(200, json={"candidates": [{"content": {"role": "model", "parts": [
            {"text": '{"results":[{"index":0,"relevance_score":0.8}]}'}]}, "finishReason": "STOP"}]})
    backend = GeminiRanking(settings)
    backend.client = genai.Client(api_key="test-key", vertexai=False, http_options=types.HttpOptions(
        httpx_client=httpx.Client(transport=httpx.MockTransport(handle)),
        retry_options=types.HttpRetryOptions(attempts=1)))
    assert backend.rank("q", ["code"]) == [(0, 0.8)]
    backend.client.close()


def test_local_models_are_selected_only_by_config(settings, monkeypatch):
    import sys
    from app.core.models.embeddings import LocalEmbeddings
    from app.core.models.ranking import LocalRanking
    sentence = Mock()
    cross = Mock()
    sentence.return_value.encode.return_value = [[1, 2]]
    cross.return_value.predict.return_value = np.array([0.4])
    monkeypatch.setitem(sys.modules, "sentence_transformers", SimpleNamespace(SentenceTransformer=sentence, CrossEncoder=cross))
    settings.embed_provider, settings.embed_model = "local", "any-local-directory"
    settings.embed_revision = "pinned-revision"
    settings.rerank_provider, settings.rerank_model = "local", "any-cross-encoder"
    model = create_embedding_backend(settings)
    ranker = create_ranking_backend(settings)
    assert isinstance(model, LocalEmbeddings) and isinstance(ranker, LocalRanking)
    assert model.encode(["code"], query=False) == [[1, 2]]
    assert ranker.rank("q", ["code"]) == [(0, 0.4)]
    sentence.assert_called_once_with("any-local-directory", revision="pinned-revision")
    cross.assert_called_once_with("any-cross-encoder")


def test_custom_protocol_can_be_registered(settings, monkeypatch):
    from app.core.models.embeddings import EMBEDDING_BACKENDS, register_embedding_backend
    from app.core.models.ranking import RANKING_BACKENDS, register_ranking_backend
    monkeypatch.setattr("app.core.models.embeddings.EMBEDDING_BACKENDS", EMBEDDING_BACKENDS.copy())
    monkeypatch.setattr("app.core.models.ranking.RANKING_BACKENDS", RANKING_BACKENDS.copy())
    register_embedding_backend("custom", lambda s: SimpleNamespace(encode=lambda texts, query: [[1, 0] for t in texts]))
    register_ranking_backend("custom", lambda s: SimpleNamespace(rank=lambda query, docs: [(i, 1.0) for i in range(len(docs))]))
    settings.embed_provider = settings.rerank_provider = "custom"
    np.testing.assert_array_equal(CodeEmbedder(settings=settings).embed_text("q"), [1, 0])
    graph = nx.MultiDiGraph()
    graph.add_node("f")
    assert CrossEncoderReranker(settings=settings).rerank("q", ["f"], graph) == [("f", 1.0)]
