from functools import cached_property

from app.core.llm.errors import ModelConfigurationError, ModelRequestError
from app.core.models.common import JsonEndpoint, api_key, ordered_embeddings


class LocalEmbeddings:
    def __init__(self, settings):
        self.settings = settings

    @cached_property
    def model(self):
        # Optional dependency: cloud deployments never import torch/transformers.
        try:
            from sentence_transformers import SentenceTransformer
        except ImportError:
            raise ModelConfigurationError("Install requirements-local-models.txt for local embeddings.") from None
        options = dict(self.settings.embed_local_model_options)
        if self.settings.embed_revision:
            options["revision"] = self.settings.embed_revision
        return SentenceTransformer(self.settings.embed_model, **options)

    def encode(self, texts, *, query):
        options = dict(self.settings.embed_local_encode_options)
        if self.settings.embed_dimensions is not None:
            options["truncate_dim"] = self.settings.embed_dimensions
        options.setdefault("normalize_embeddings", True)
        return self.model.encode(texts, **options)


class UniXcoderEmbeddings:
    """Encoder-only formatting and masked mean pooling from Microsoft's reference."""

    def __init__(self, settings):
        self.settings = settings

    @cached_property
    def runtime(self):
        try:
            import torch
            from transformers import RobertaConfig, RobertaModel, RobertaTokenizer
        except ImportError:
            raise ModelConfigurationError("Install requirements-local-models.txt for UniXcoder.") from None
        options = dict(self.settings.embed_local_model_options)
        device = options.pop("device", "cpu")
        if self.settings.embed_revision:
            options["revision"] = self.settings.embed_revision
        tokenizer = RobertaTokenizer.from_pretrained(self.settings.embed_model, **options)
        config = RobertaConfig.from_pretrained(self.settings.embed_model, **options)
        config.is_decoder = True
        # Eager attention supports the bidirectional 3D reference mask.
        options.setdefault("attn_implementation", "eager")
        model = RobertaModel.from_pretrained(self.settings.embed_model, config=config, **options)
        return tokenizer, model.to(device).eval(), torch

    def encode(self, texts, *, query):
        tokenizer, model, torch = self.runtime
        sequences = []
        for text in texts:
            body = tokenizer.tokenize(text)[:self.settings.embed_local_max_length - 4]
            tokens = [tokenizer.cls_token, "<encoder-only>", tokenizer.sep_token, *body, tokenizer.sep_token]
            sequences.append(tokenizer.convert_tokens_to_ids(tokens))
        width = max(map(len, sequences))
        ids = torch.tensor([row + [tokenizer.pad_token_id] * (width - len(row)) for row in sequences],
                           device=model.device)
        mask = ids.ne(tokenizer.pad_token_id)
        with torch.inference_mode():
            hidden = model(ids, attention_mask=mask[:, :, None] & mask[:, None, :])[0]
            pooled = (hidden * mask[:, :, None]).sum(1) / mask.sum(1)[:, None]
        return pooled.float().cpu().numpy()


class GeminiEmbeddings:
    def __init__(self, settings):
        self.settings = settings
        self.key = api_key(settings, "embed", "gemini")

    @cached_property
    def client(self):
        from google import genai
        from google.genai import types
        options = {"timeout": int(self.settings.retrieval_model_timeout_seconds * 1000),
                   "retry_options": types.HttpRetryOptions(attempts=self.settings.retrieval_model_attempts)}
        if self.settings.embed_base_url:
            options["base_url"] = self.settings.embed_base_url
        return genai.Client(api_key=self.key, vertexai=False, http_options=types.HttpOptions(**options))

    def encode(self, texts, *, query):
        from google.genai import types
        from google.genai.errors import APIError
        import httpx
        options = {}
        if self.settings.embed_dimensions is not None:
            options["output_dimensionality"] = self.settings.embed_dimensions
        task = self.settings.embed_query_task if query else self.settings.embed_document_task
        if task:
            options["task_type"] = task
        try:
            response = self.client.models.embed_content(
                model=self.settings.embed_model,
                # Explicit Content objects keep document boundaries intact. Some
                # SDK/model combinations merge a list of strings into one content.
                contents=[types.Content(role="user", parts=[types.Part.from_text(text=text)])
                          for text in texts],
                config=types.EmbedContentConfig(**options))
            return [embedding.values for embedding in response.embeddings]
        except (APIError, httpx.HTTPError, TypeError, AttributeError):
            raise ModelRequestError("Gemini embeddings failed; check model, quota and configuration. No fallback was used.") from None


class ApiEmbeddings:
    def __init__(self, settings):
        self.settings = settings
        provider = settings.embed_provider
        self.voyage = provider == "voyage"
        if self.voyage:
            base_url = settings.embed_base_url or settings.voyage_base_url
        elif provider == "openai":
            base_url = settings.embed_base_url or settings.embedding_openai_base_url
        else:
            base_url = settings.embed_base_url
        self.endpoint = JsonEndpoint(settings, base_url, api_key(
            settings, "embed", provider, required=provider != "openai_compatible"))

    def encode(self, texts, *, query):
        payload = {"model": self.settings.embed_model, "input": texts}
        if self.voyage:
            payload["input_type"] = "query" if query else "document"
            payload["truncation"] = False
        else:
            payload["encoding_format"] = "float"
        if self.settings.embed_dimensions is not None:
            payload["output_dimension" if self.voyage else "dimensions"] = self.settings.embed_dimensions
        response = self.endpoint.post("embeddings", payload)
        if not isinstance(response, dict):
            raise ModelRequestError("Embedding endpoint returned an invalid response.")
        return ordered_embeddings(response.get("data"), len(texts))


# Register additional implementations here or through register_embedding_backend.
EMBEDDING_BACKENDS = {
    "local": LocalEmbeddings,
    "unixcoder": UniXcoderEmbeddings,
    "gemini": GeminiEmbeddings,
    "voyage": ApiEmbeddings,
    "openai": ApiEmbeddings,
    "openai_compatible": ApiEmbeddings,
}


def register_embedding_backend(name, builder):
    EMBEDDING_BACKENDS[name] = builder


def create_embedding_backend(settings):
    if not settings.embed_model.strip():
        raise ModelConfigurationError("Set EMBED_MODEL.")
    try:
        builder = EMBEDDING_BACKENDS[settings.embed_provider]
    except KeyError:
        raise ModelConfigurationError(f"Unsupported embedding provider: {settings.embed_provider}.") from None
    return builder(settings)
