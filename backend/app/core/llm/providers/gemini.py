from google import genai
from google.genai import errors, types
import httpx

from app.core.llm.base import BaseLLM
from app.core.llm.errors import ModelRequestError


class GeminiLLM(BaseLLM):
    def __init__(
        self,
        api_key: str,
        model_name: str,
        timeout: float = 60,
        max_output_tokens: int = 4096,
        thinking_level: str = "low",
    ):
        self.client = genai.Client(
            api_key=api_key,
            vertexai=False,
            http_options=types.HttpOptions(
                timeout=int(timeout * 1000),
                retry_options=types.HttpRetryOptions(attempts=1),
            ),
        )
        self.model_name = model_name
        self.max_output_tokens = max_output_tokens
        self.thinking_config = (
            types.ThinkingConfig(thinking_level=thinking_level)
            if model_name.removeprefix("models/").startswith("gemini-3.")
            else None
        )

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    max_output_tokens=self.max_output_tokens,
                    thinking_config=self.thinking_config,
                ),
            )
        except (errors.APIError, httpx.HTTPError) as exc:
            raise ModelRequestError(
                f"Gemini model '{self.model_name}' failed. "
                "Check its availability, API key, and quota. No fallback was used."
            ) from exc

        if (
            response.candidates
            and response.candidates[0].finish_reason == types.FinishReason.MAX_TOKENS
        ):
            raise ModelRequestError(
                "Gemini reached LLM_MAX_OUTPUT_TOKENS. "
                "Increase it and retry. No fallback was used."
            )
        if not response.text or not response.text.strip():
            raise ModelRequestError(
                f"Gemini model '{self.model_name}' returned no text. No fallback was used."
            )
        return response.text
