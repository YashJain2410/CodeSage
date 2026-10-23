from functools import lru_cache

from app.config import get_settings
from app.core.llm.base import BaseLLM
from app.core.llm.errors import ModelConfigurationError
from app.core.llm.providers.anthropic import AnthropicLLM
from app.core.llm.providers.gemini import GeminiLLM
from app.core.llm.providers.openai import OpenAILLM


# These providers accept the same text chat request format as OpenAI.
OPENAI_COMPATIBLE_URLS = {
    "openai": "https://api.openai.com/v1",
    "deepseek": "https://api.deepseek.com",
    "groq": "https://api.groq.com/openai/v1",
    "mistral": "https://api.mistral.ai/v1",
    "xai": "https://api.x.ai/v1",
    "openrouter": "https://openrouter.ai/api/v1",
}
SUPPORTED_PROVIDERS = ("gemini", "anthropic", *OPENAI_COMPATIBLE_URLS)


def resolve_model(
    provider: str | None = None,
    model_name: str | None = None,
) -> tuple[str, str]:
    settings = get_settings()
    selected_provider = provider if provider is not None else settings.llm_provider
    selected_provider = selected_provider.strip().lower()
    if selected_provider == "google":
        selected_provider = "gemini"

    if selected_provider not in SUPPORTED_PROVIDERS:
        raise ModelConfigurationError(f"Unsupported model provider: {selected_provider}.")

    selected_model = model_name
    if selected_model is None:
        selected_model = getattr(settings, f"{selected_provider}_model")
    if not selected_model or not selected_model.strip():
        raise ModelConfigurationError(f"Set {selected_provider.upper()}_MODEL or provide model_name.")

    api_key = getattr(settings, f"{selected_provider}_api_key")
    if not api_key or not api_key.strip():
        raise ModelConfigurationError(
            f"Set {selected_provider.upper()}_API_KEY before using this provider."
        )

    # OpenRouter's auto router chooses models itself, which bypasses explicit selection.
    if selected_provider == "openrouter" and (
        selected_model.strip() in {"openrouter/auto", "openrouter/free"}
    ):
        raise ModelConfigurationError(
            "Use a fixed OpenRouter model instead of an automatic model router."
        )

    return selected_provider, selected_model.strip()


def get_llm(provider: str | None = None, model_name: str | None = None) -> BaseLLM:
    selected_provider, selected_model = resolve_model(provider, model_name)
    return _create_llm(selected_provider, selected_model)


@lru_cache(maxsize=32)
def _create_llm(provider: str, model_name: str) -> BaseLLM:
    settings = get_settings()
    options = {
        "api_key": getattr(settings, f"{provider}_api_key"),
        "model_name": model_name,
        "timeout": settings.llm_timeout_seconds,
        "max_output_tokens": settings.llm_max_output_tokens,
    }

    if provider == "gemini":
        return GeminiLLM(**options, thinking_level=settings.gemini_thinking_level)
    if provider == "anthropic":
        return AnthropicLLM(**options)
    return OpenAILLM(
        **options,
        provider=provider,
        base_url=OPENAI_COMPATIBLE_URLS[provider],
    )
