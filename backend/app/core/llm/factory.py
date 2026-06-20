from app.core.llm.providers.gemini import GeminiLLM
from app.core.llm.providers.openai import OpenAILLM

from app.config import get_settings


def get_llm(
        provider: str,
        model_name: str,
):
    
    settings = get_settings()

    if provider == "gemini":

        return GeminiLLM(
            api_key=settings.gemini_api_key,
            model_name=model_name
        )
    
    if provider == "openai":

        return OpenAILLM(
            api_key=settings.openai_api_key,
            model_name=model_name,
        )
    
    raise ValueError(f"Unknown provider: {provider}")