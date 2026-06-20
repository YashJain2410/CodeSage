from openai import OpenAI

from app.core.llm.base import BaseLLM


class OpenAILLM(BaseLLM):

    def __init__(
        self,
        api_key: str,
        model_name: str,
    ):
        self.client = OpenAI(
            api_key=api_key
        )

        self.model_name = model_name

    def generate(
        self,
        system_prompt,
        user_prompt,
    ):

        response = self.client.chat.completions.create(
            model=self.model_name,
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
        )

        return (
            response
            .choices[0]
            .message.content
        )