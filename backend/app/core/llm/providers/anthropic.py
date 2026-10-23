import httpx

from app.core.llm.base import BaseLLM
from app.core.llm.errors import ModelRequestError


class AnthropicLLM(BaseLLM):
    def __init__(
        self,
        api_key: str,
        model_name: str,
        timeout: float = 60,
        max_output_tokens: int = 4096,
    ):
        self.client = httpx.Client(
            base_url="https://api.anthropic.com/v1/",
            headers={"x-api-key": api_key, "anthropic-version": "2023-06-01"},
            timeout=timeout,
        )
        self.model_name = model_name
        self.max_output_tokens = max_output_tokens

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        try:
            response = self.client.post(
                "messages",
                json={
                    "model": self.model_name,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                    "max_tokens": self.max_output_tokens,
                },
            )
            response.raise_for_status()
            data = response.json()
            answer = "".join(
                block["text"] for block in data["content"] if block["type"] == "text"
            )
        except (httpx.HTTPError, KeyError, TypeError, ValueError) as exc:
            raise ModelRequestError(
                f"Anthropic model '{self.model_name}' failed. "
                "Check its availability, API key, and quota. No fallback was used."
            ) from exc

        if data.get("stop_reason") == "max_tokens":
            raise ModelRequestError(
                "Anthropic reached LLM_MAX_OUTPUT_TOKENS. "
                "Increase it and retry. No fallback was used."
            )
        if not answer.strip():
            raise ModelRequestError(
                f"Anthropic model '{self.model_name}' returned no text. No fallback was used."
            )
        return answer
