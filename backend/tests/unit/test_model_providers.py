import json
from unittest.mock import Mock

import httpx
from google import genai
from google.genai import types
from openai import OpenAI
from pydantic import ValidationError
import pytest

from app.config import Settings
from app.core.llm import factory
from app.core.llm.errors import ModelConfigurationError, ModelRequestError
from app.core.llm.providers.anthropic import AnthropicLLM
from app.core.llm.providers.gemini import GeminiLLM
from app.core.llm.providers.openai import OpenAILLM
from app.core.retrieval import intent
from app.schemas.query import QueryRequest


@pytest.fixture
def settings(monkeypatch):
    settings = Settings(
        _env_file=None,
        database_url="postgresql+asyncpg://test:test@localhost/codesage",
        gemini_api_key="test-google-key",
        gemini_model="gemini-3.8-flash",
        llm_provider="gemini",
    )
    monkeypatch.setattr(factory, "get_settings", lambda: settings)
    factory._create_llm.cache_clear()
    yield settings
    factory._create_llm.cache_clear()


def test_environment_default_and_google_alias(settings):
    assert factory.resolve_model() == ("gemini", "gemini-3.8-flash")
    assert factory.resolve_model("google") == ("gemini", "gemini-3.8-flash")
    settings.gemini_model = "another-google-model"
    assert factory.resolve_model() == ("gemini", "another-google-model")


def test_request_selection_and_environment_provider(settings):
    settings.openai_api_key = "test-openai-key"
    settings.openai_model = "configured-openai-model"
    settings.llm_provider = "openai"
    assert factory.resolve_model() == ("openai", "configured-openai-model")
    assert factory.resolve_model("openai", "requested-model") == ("openai", "requested-model")
    assert factory.resolve_model("gemini") == ("gemini", "gemini-3.8-flash")


@pytest.mark.parametrize("provider,model,message", [
    ("unknown", "test", "Unsupported model provider"),
    ("", "test", "Unsupported model provider"),
    ("openai", None, "OPENAI_MODEL"),
    ("openai", "test", "OPENAI_API_KEY"),
    ("gemini", " ", "GEMINI_MODEL"),
])
def test_bad_selection_never_uses_another_provider(settings, provider, model, message):
    with pytest.raises(ModelConfigurationError, match=message):
        factory.get_llm(provider, model)


def test_missing_default_key_is_not_replaced(settings):
    settings.gemini_api_key = None
    settings.openai_api_key = "available-but-not-selected"
    with pytest.raises(ModelConfigurationError, match="GEMINI_API_KEY"):
        factory.get_llm()


def test_request_defaults_do_not_override_environment():
    request = QueryRequest(query="question", repository_id="repo")
    assert request.model_provider is None
    assert request.model_name is None
    with pytest.raises(ValidationError):
        QueryRequest(query="question", repository_id="repo", model_name="")


@pytest.mark.parametrize("provider,url", factory.OPENAI_COMPATIBLE_URLS.items())
def test_compatible_providers_use_their_own_credentials_and_endpoint(settings, monkeypatch, provider, url):
    setattr(settings, f"{provider}_api_key", f"test-{provider}-key")
    setattr(settings, f"{provider}_model", "configured-model")
    adapter = Mock()
    monkeypatch.setattr(factory, "OpenAILLM", adapter)
    first = factory.get_llm(provider)
    assert factory.get_llm(provider) is first
    adapter.assert_called_once_with(
        api_key=f"test-{provider}-key", model_name="configured-model", provider=provider,
        base_url=url, timeout=60, max_output_tokens=4096,
    )


def test_native_provider_factories(settings, monkeypatch):
    google = Mock()
    anthropic = Mock()
    monkeypatch.setattr(factory, "GeminiLLM", google)
    monkeypatch.setattr(factory, "AnthropicLLM", anthropic)
    factory.get_llm("google")
    factory.get_llm("gemini")
    google.assert_called_once_with(
        api_key="test-google-key", model_name="gemini-3.8-flash", timeout=60,
        max_output_tokens=4096, thinking_level="low",
    )
    settings.anthropic_api_key = "test-anthropic-key"
    settings.anthropic_model = "selected-claude"
    factory.get_llm("anthropic")
    anthropic.assert_called_once_with(
        api_key="test-anthropic-key", model_name="selected-claude", timeout=60,
        max_output_tokens=4096,
    )


@pytest.mark.parametrize("model", ["openrouter/auto", "openrouter/free"])
def test_openrouter_automatic_routing_is_rejected(settings, model):
    settings.openrouter_api_key = "test-key"
    with pytest.raises(ModelConfigurationError, match="fixed OpenRouter model"):
        factory.resolve_model("openrouter", model)


def google_adapter(handler):
    llm = GeminiLLM(api_key="test-key", model_name="gemini-3.8-flash")
    llm.client.close()
    llm.client = genai.Client(
        api_key="test-key", vertexai=False,
        http_options=types.HttpOptions(
            httpx_client=httpx.Client(transport=httpx.MockTransport(handler)),
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )
    return llm


def test_google_sdk_sends_the_exact_model_and_low_thinking_level():
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(200, json={"candidates": [{
            "content": {"role": "model", "parts": [{"text": "test answer"}]},
            "finishReason": "STOP",
        }]})
    llm = google_adapter(respond)
    try:
        assert llm.generate("system instructions", "question") == "test answer"
        request = requests[0]
        payload = json.loads(request.content)
        assert "gemini-3.8-flash:generateContent" in request.url.path
        assert payload["systemInstruction"]["parts"][0]["text"] == "system instructions"
        assert payload["generationConfig"]["thinkingConfig"]["thinking_level"] == "LOW"
        assert payload["generationConfig"]["maxOutputTokens"] == 4096
        assert len(requests) == 1
    finally:
        llm.client.close()


def test_google_rate_limit_does_not_retry_or_switch_models():
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(429, json={"error": {"code": 429, "message": "rate limited", "status": "RESOURCE_EXHAUSTED"}})
    llm = google_adapter(respond)
    try:
        with pytest.raises(ModelRequestError, match="No fallback was used"):
            llm.generate("system", "question")
        assert len(requests) == 1
    finally:
        llm.client.close()


@pytest.mark.parametrize("provider", ["openai", "deepseek", "groq", "mistral", "xai", "openrouter"])
def test_openai_sdk_payload_and_fallback_prevention(provider):
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(200, json={"id": "test", "object": "chat.completion", "created": 0,
            "model": "chosen-model", "choices": [{"index": 0, "finish_reason": "stop",
                "message": {"role": "assistant", "content": "answer"}}]})
    llm = OpenAILLM(api_key="test-key", model_name="chosen-model", provider=provider)
    llm.client.close()
    llm.client = OpenAI(api_key="test-key", base_url=factory.OPENAI_COMPATIBLE_URLS[provider],
        max_retries=0, http_client=httpx.Client(transport=httpx.MockTransport(respond)))
    try:
        assert llm.generate("instructions", "question") == "answer"
        payload = json.loads(requests[0].content)
        assert payload["model"] == "chosen-model"
        assert payload["messages"][0] == {"role": "system", "content": "instructions"}
        limit = "max_completion_tokens" if provider == "openai" else "max_tokens"
        assert payload[limit] == 4096
        if provider == "openrouter":
            assert payload["provider"]["allow_fallbacks"] is False
        assert len(requests) == 1
    finally:
        llm.client.close()


def test_openai_authentication_failure_does_not_retry_or_switch():
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(401, json={"error": {"message": "invalid key", "type": "authentication_error"}})
    llm = OpenAILLM(api_key="test-key", model_name="chosen-model")
    llm.client.close()
    llm.client = OpenAI(api_key="test-key", max_retries=0,
        http_client=httpx.Client(transport=httpx.MockTransport(respond)))
    try:
        with pytest.raises(ModelRequestError, match="No fallback was used"):
            llm.generate("system", "question")
        assert len(requests) == 1
    finally:
        llm.client.close()


@pytest.mark.parametrize("status", [200, 401, 429])
def test_anthropic_messages_api_and_failure_handling(status):
    requests = []
    def respond(request):
        requests.append(request)
        return httpx.Response(status, json={"content": [{"type": "text", "text": "answer"}]})
    llm = AnthropicLLM(api_key="test-key", model_name="chosen-claude")
    headers = llm.client.headers
    llm.client.close()
    llm.client = httpx.Client(base_url="https://api.anthropic.com/v1/", headers=headers,
        transport=httpx.MockTransport(respond))
    try:
        if status == 200:
            assert llm.generate("instructions", "question") == "answer"
            payload = json.loads(requests[0].content)
            assert payload["model"] == "chosen-claude"
            assert payload["system"] == "instructions"
            assert payload["max_tokens"] == 4096
            assert requests[0].url.path == "/v1/messages"
            assert requests[0].headers["x-api-key"] == "test-key"
        else:
            with pytest.raises(ModelRequestError, match="No fallback was used"):
                llm.generate("instructions", "question")
        assert len(requests) == 1
    finally:
        llm.client.close()


@pytest.mark.parametrize("answer", ["unexpected label", ModelRequestError("model unavailable")])
def test_intent_failures_are_not_silently_replaced(monkeypatch, answer):
    llm = Mock()
    if isinstance(answer, Exception):
        llm.generate.side_effect = answer
    else:
        llm.generate.return_value = answer
    get_llm = Mock(return_value=llm)
    monkeypatch.setattr(intent, "get_llm", get_llm)
    with pytest.raises(ModelRequestError):
        intent.QueryIntentClassifier().classify("hello", "anthropic", "chosen-claude")
    get_llm.assert_called_once_with("anthropic", "chosen-claude")


def test_intent_uses_the_same_selection_as_the_answer(monkeypatch):
    get_llm = Mock(return_value=Mock(generate=Mock(return_value="BUG")))
    monkeypatch.setattr(intent, "get_llm", get_llm)
    result = intent.QueryIntentClassifier().classify("hello", "anthropic", "chosen-claude")
    assert result.intent == intent.QueryIntent.BUG
    get_llm.assert_called_once_with("anthropic", "chosen-claude")


@pytest.fixture
def query_routes(monkeypatch):
    # Import API wiring without downloading the unrelated local search models.
    from unittest.mock import patch
    with patch("app.core.indexer.embedder.CodeEmbedder.__init__", return_value=None), \
         patch("app.core.retrieval.reranker.CrossEncoderReranker.__init__", return_value=None):
        from app.api.routes import query
    return query


def test_query_service_resolves_defaults_before_running_workflow(settings, query_routes, monkeypatch):
    from contextlib import nullcontext
    from app.services import query_service
    workflow = Mock(invoke=lambda state, config: state)
    monkeypatch.setattr(query_service, "graph", workflow)
    monkeypatch.setattr(query_service, "query_tracing", nullcontext)
    result = query_service.QueryService(call_graph=None).answer("hello")
    assert result["model_provider"] == "gemini"
    assert result["model_name"] == "gemini-3.8-flash"


@pytest.mark.parametrize("error,status", [
    (ModelConfigurationError("Missing provider key"), 400),
    (ModelRequestError("Model failed. No fallback was used."), 502),
])
def test_api_reports_model_errors_instead_of_success(query_routes, monkeypatch, error, status):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    monkeypatch.setattr(query_routes, "QueryService", Mock(return_value=Mock(answer=Mock(side_effect=error))))
    app = FastAPI()
    app.include_router(query_routes.router)
    response = TestClient(app).post("/query", json={"query": "hello", "repository_id": "repo"})
    assert response.status_code == status
    assert response.json()["detail"] == str(error)


def test_api_returns_selected_model(query_routes, monkeypatch):
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    answer = Mock(return_value={"answer": "answer", "intent": intent.QueryIntent.EXPLAIN,
        "confidence": 1, "citations": [], "model_provider": "anthropic", "model_name": "chosen-claude"})
    monkeypatch.setattr(query_routes, "QueryService", Mock(return_value=Mock(answer=answer)))
    app = FastAPI()
    app.include_router(query_routes.router)
    response = TestClient(app).post("/query", json={"query": "hello", "repository_id": "repo",
        "model_provider": "anthropic", "model_name": "chosen-claude"})
    assert response.status_code == 200
    assert response.json()["model_provider"] == "anthropic"
    assert response.json()["model_name"] == "chosen-claude"
    answer.assert_called_once_with(query="hello", provider="anthropic", model="chosen-claude")


@pytest.mark.parametrize("text,reason", [("", "STOP"), ("partial answer", "MAX_TOKENS")])
def test_google_empty_or_truncated_text_is_an_error(text, reason):
    llm = google_adapter(lambda request: httpx.Response(200, json={"candidates": [{
        "content": {"parts": [{"text": text}], "role": "model"}, "finishReason": reason,
    }]}))
    try:
        with pytest.raises(ModelRequestError):
            llm.generate("instructions", "question")
    finally:
        llm.client.close()


def test_question_workflow_uses_one_selected_provider_for_both_calls(settings, query_routes, monkeypatch):
    from contextlib import nullcontext
    import networkx as nx
    from app.core.agent import nodes
    from app.services import query_service

    settings.anthropic_api_key = "test-anthropic-key"
    settings.anthropic_model = "chosen-claude"
    settings.llm_provider = "anthropic"
    model = Mock(generate=Mock(side_effect=["EXPLAIN", "answer from selected model"]))
    create_model = Mock(return_value=model)
    monkeypatch.setattr(factory, "AnthropicLLM", create_model)
    monkeypatch.setattr(query_service, "query_tracing", nullcontext)
    call_graph = nx.MultiDiGraph()
    call_graph.add_node("target")
    monkeypatch.setattr(nodes.app_state, "graph", call_graph)
    monkeypatch.setattr(nodes.app_state.retriever, "search", Mock(return_value=[("target", 0.9)]))
    monkeypatch.setattr(nodes.reranker, "rerank", Mock(return_value=[("target", 0.9)]))
    monkeypatch.setattr(nodes.assembler, "assemble", Mock(return_value="sample code context"))

    result = query_service.QueryService(call_graph=call_graph).answer("hello")

    assert result["answer"] == "answer from selected model"
    assert result["model_provider"] == "anthropic"
    assert result["model_name"] == "chosen-claude"
    assert model.generate.call_count == 2
    create_model.assert_called_once_with(
        api_key="test-anthropic-key", model_name="chosen-claude", timeout=60,
        max_output_tokens=4096,
    )
