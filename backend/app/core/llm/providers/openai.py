from openai import APIError, OpenAI

from app.core.llm.base import BaseLLM
from app.core.llm.errors import ModelRequestError


class OpenAILLM(BaseLLM):
    def __init__(
        self,
        api_key: str,
        model_name: str,
        provider: str = "openai",
        base_url: str = "https://api.openai.com/v1",
        timeout: float = 60,
        max_output_tokens: int = 4096,
    ):
        self.client = OpenAI(
            api_key=api_key, base_url=base_url, timeout=timeout, max_retries=0,
        )
        self.provider = provider
        self.model_name = model_name
        self.max_output_tokens = max_output_tokens

    def generate(self, system_prompt: str, user_prompt: str) -> str:
        token_parameter = "max_completion_tokens" if self.provider == "openai" else "max_tokens"
        options = {token_parameter: self.max_output_tokens}
        if self.provider == "openrouter":
            options["extra_body"] = {"provider": {"allow_fallbacks": False}}

        try:
            response = self.client.chat.completions.create(
                model=self.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                **options,
            )
        except APIError as exc:
            raise ModelRequestError(
                f"{self.provider} model '{self.model_name}' failed. "
                "Check its availability, API key, and quota. No fallback was used."
            ) from exc

        if response.choices and response.choices[0].finish_reason == "length":
            raise ModelRequestError(
                "The selected model reached LLM_MAX_OUTPUT_TOKENS. "
                "Increase it and retry. No fallback was used."
            )
        answer = response.choices[0].message.content if response.choices else None
        if not answer or not answer.strip():
            raise ModelRequestError(
                f"{self.provider} model '{self.model_name}' returned no text. No fallback was used."
            )
        return answer
