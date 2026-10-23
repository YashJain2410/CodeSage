# Embeddings and reranking configuration

Defaults are centralized in `backend/app/config.py`. Override them in the root `.env` or deployment environment; restart API and workers afterwards. Embeddings, reranking and generation are independent selections. There are no model-ID switches in pipeline code and no silent provider fallback.

Default cloud configuration:

```dotenv
GEMINI_API_KEY=your-key
EMBED_PROVIDER=gemini
EMBED_MODEL=gemini-embedding-2
RERANK_PROVIDER=gemini
RERANK_MODEL=gemini-3.8-flash
```

Gemini reranking uses structured LLM relevance scoring, not a dedicated Google reranker endpoint. `RERANK_*` is independent of the answer/intent settings (`LLM_PROVIDER`, `GEMINI_MODEL`, etc.). Cloud startup neither imports nor loads local model runtimes. Clients and models initialize only when used.

## Supported embedding interfaces

| `EMBED_PROVIDER` | Interface | Credentials |
| --- | --- | --- |
| `gemini` | Google `embed_content` | `EMBED_API_KEY` or `GEMINI_API_KEY` |
| `voyage` | Voyage embeddings | `EMBED_API_KEY` or `VOYAGE_API_KEY` |
| `unixcoder` | Local UniXcoder with encoder-only tokens, bidirectional mask and masked mean pooling | Optional local packages |
| `local` | Local SentenceTransformer-compatible checkpoint or directory | Optional local packages |
| `openai` | OpenAI embedding API | `EMBED_API_KEY` or `OPENAI_API_KEY` |
| `openai_compatible` | Local/cloud `/embeddings` API with OpenAI JSON schema | Required `EMBED_BASE_URL`; optional `EMBED_API_KEY` |

`EMBED_MODEL` accepts the selected provider's checkpoint name/path/model ID. `EMBED_BASE_URL` can also override the native cloud endpoint. Provider defaults (`VOYAGE_BASE_URL`, `EMBEDDING_OPENAI_BASE_URL`) are configurable.

`EMBED_DIMENSIONS` is optional: omit it to detect the model's native returned dimension. If set, request that dimension and reject mismatches. Local SentenceTransformer uses `truncate_dim`; only use that for models supporting dimensional truncation. UniXcoder keeps its native dimension and rejects incompatible overrides. All vectors are normalized and checked for consistent dimensions, finite values and nonzero norms.

### Local UniXcoder

```bash
cd backend
python -m pip install -r requirements-local-models.txt
```

```dotenv
EMBED_PROVIDER=unixcoder
EMBED_MODEL=microsoft/unixcoder-base
EMBED_LOCAL_MODEL_OPTIONS={"device":"cpu"}
EMBED_LOCAL_MAX_LENGTH=512
```

Remove incompatible dimension, task or prefix overrides when switching. The UniXcoder adapter follows [Microsoft's reference inference format](https://github.com/microsoft/CodeBERT/tree/master/UniXcoder). `EMBED_REVISION` can pin a checkpoint revision.

### Voyage Code

```dotenv
EMBED_PROVIDER=voyage
EMBED_MODEL=voyage-code-4
VOYAGE_API_KEY=your-key
```

Indexing sends `input_type=document`; questions use `input_type=query`. Oversized inputs fail rather than silently truncating. Adjust batch and chunk size for provider token limits.

### Other local models

```dotenv
EMBED_PROVIDER=local
EMBED_MODEL=Qwen/Qwen3-Embedding-0.6B
EMBED_LOCAL_MODEL_OPTIONS={"device":"cpu"}
EMBED_QUERY_PREFIX="Instruct: Given a question about code, retrieve relevant source code\nQuery: "
```

Follow the checkpoint's own prompt and pooling requirements. `EMBED_LOCAL_ENCODE_OPTIONS` accepts SentenceTransformer encode options as JSON. `EMBED_QUERY_PREFIX` and `EMBED_DOCUMENT_PREFIX` are concatenated verbatim, including spaces/newlines. For Gemini models supporting task types, set optional `EMBED_QUERY_TASK`/`EMBED_DOCUMENT_TASK`; leave these unset for Gemini Embedding 2, which does not use `task_type`.

### Self-hosted embedding server

```dotenv
EMBED_PROVIDER=openai_compatible
EMBED_MODEL=your-model-id
EMBED_BASE_URL=http://localhost:8001/v1
# EMBED_API_KEY=only-if-required
```

The server must implement `POST /embeddings` relative to the base URL. The body contains `model`, `input`, `encoding_format=float`, and optional `dimensions`. Responses must contain indexed `data` entries with `embedding` vectors. Out-of-order responses are restored; missing/duplicate entries fail. An unrelated proprietary schema requires a new adapter.

## Supported reranking interfaces

| `RERANK_PROVIDER` | Interface | Credentials |
| --- | --- | --- |
| `gemini` | Structured LLM scores for every candidate | `RERANK_API_KEY` or `GEMINI_API_KEY` |
| `voyage` | Voyage `/rerank`, `top_k`, response `data` | `RERANK_API_KEY` or `VOYAGE_API_KEY` |
| `cohere` | Cohere `/rerank`, `top_n`, response `results` | `RERANK_API_KEY` or `COHERE_API_KEY` |
| `local` | SentenceTransformer CrossEncoder-compatible checkpoint/path | Optional local packages |
| `http` | Local/cloud Cohere-compatible `/rerank` JSON | Required `RERANK_BASE_URL`; optional `RERANK_API_KEY` |
| `none` | Preserve candidate order with no inference | None |

Examples (each block is an alternative):

```dotenv
RERANK_PROVIDER=local
RERANK_MODEL=cross-encoder/ms-marco-MiniLM-L6-v2
RERANK_LOCAL_MODEL_OPTIONS={"device":"cpu"}
```

```dotenv
RERANK_PROVIDER=voyage
RERANK_MODEL=rerank-3-lite
VOYAGE_API_KEY=your-key
```

```dotenv
RERANK_PROVIDER=cohere
RERANK_MODEL=rerank-v5.0-pro
COHERE_API_KEY=your-key
```

```dotenv
RERANK_PROVIDER=http
RERANK_MODEL=your-server-model-id
RERANK_BASE_URL=http://localhost:8002/v1
```

Set `RERANK_PROVIDER=none` to skip ranking. `RERANK_REVISION` pins local checkpoint revisions. `RERANK_LOCAL_PREDICT_OPTIONS` accepts CrossEncoder options as JSON. Override `RERANK_BASE_URL` for a gateway or provider endpoint; default cloud URLs live in settings.

`RERANK_BATCH_SIZE` controls candidates per request, `RERANK_MAX_CANDIDATES` caps scoring work, and `RERANK_TOP_K` selects final results. Empty candidate lists make no call. Responses must contain exactly one finite score per index. Gemini scores must be between 0 and 1; they are not calibrated answer-confidence values, and scores from separate LLM batches may not be perfectly comparable. Evaluate before choosing a batch size or replacing a dedicated reranker.

## Limits and error handling

- `RETRIEVAL_MODEL_TIMEOUT_SECONDS`, `RETRIEVAL_MODEL_ATTEMPTS` and `RETRIEVAL_MODEL_RETRY_DELAY_SECONDS` control remote requests. HTTP adapters retry transport failures, 429 and 5xx with bounded exponential backoff; Gemini uses SDK retries. No error switches to a different provider/model.
- `EMBED_BATCH_SIZE` batches documents. Native per-input/request token limits still apply; reduce batch/chunk sizes if needed.
- Optional `EMBEDDING_SOURCE_MAX_CHARS` and `RERANK_DOCUMENT_MAX_CHARS` cap source text; omitted means complete source. They are character limits, not token counts. Context assembly retains its separate limits.
- `EMBEDDING_GRAPH_NEIGHBORS` controls metadata. Bump `EMBEDDING_REPRESENTATION_VERSION` after preprocessing changes.
- Error messages omit source and raw provider response bodies. Query configuration errors map to HTTP 400; inference errors map to HTTP 502.
- Providers receive the submitted code and questions. Quotas, API model availability and data-use policies are account/provider-specific.

## Model changes and indexes

Collections are named `QDRANT_COLLECTION_<embedding configuration hash>`. Identity includes provider, model, revision, endpoint, configured dimension, prompts/tasks and preprocessing; it excludes provider/role credentials. Rotating a key does not require reindexing. Embedding-cache keys include the same identity and exact graph-enriched input text.

**Reimport/reindex after changing an embedding model or its preprocessing.** Old collections remain available; queries never silently read a different model's vectors, even when dimensions match. Legacy unsuffixed `codesage` collections require reindexing. If an endpoint's model alias or local files change without changing the model name/path, bump `EMBED_REVISION` yourself.

Reindexing the same configuration still replaces that configuration's existing collection after embedding generation; upload is not an atomic migration with automatic rollback. Changing only a reranker or generator does not require re-embedding.

## New API protocols

“Any model” means one implementing a supported interface, or one with a registered adapter. It does not imply every arbitrary architecture/API works without its required implementation.

Implement `EmbeddingBackend.encode(texts, query=...)` or `RankingBackend.rank(query, documents)` in `app/core/models/common.py`. Register its settings-to-backend builder through `register_embedding_backend(name, builder)` or `register_ranking_backend(name, builder)` before inference, then select the provider name in the environment. Pipeline code stays unchanged. Tests can inject `backend=` directly into either facade.

## Installation and testing

Default `requirements.txt` omits PyTorch, Transformers and SentenceTransformers. Local inference requires `requirements-local-models.txt`. Docker defaults to cloud inference; opt into local packages with `--build-arg INSTALL_LOCAL_MODELS=true`.

```bash
cd backend
python -m pytest -m 'not model' -q
```

Tests use mocked SDKs, HTTP transports and in-memory Qdrant. Actual provider account access and deployed memory limits still require a deployment smoke test.

References: [Gemini embeddings](https://ai.google.dev/gemini-api/docs/embeddings), [Voyage embeddings](https://docs.voyageai.com/reference/embeddings-api), [Voyage reranking](https://docs.voyageai.com/reference/reranker-api), [Cohere reranking](https://docs.cohere.com/v2/reference/rerank), [OpenAI embeddings](https://developers.openai.com/api/reference/resources/embeddings/methods/create).
