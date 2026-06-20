from google import genai
from google.genai import types
from app.core.llm.base import BaseLLM


class GeminiLLM(BaseLLM):
    def __init__(
        self,
        api_key: str,
        model_name: str = "gemini-3.5-flash",
        handler=None,
    ):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name
        self.handler = handler

    def generate(
        self,
        system_prompt: str,
        user_prompt: str,
    ) -> str:
        if self.handler:
            self.handler.log_model(
                provider="gemini",
                model=self.model_name
            )

        response = self.client.models.generate_content(
            model=self.model_name,
            contents=user_prompt,
            config=types.GenerateContentConfig(
                system_instruction=system_prompt
            ),
        )

        return response.text


# import google.generativeai as genai
# from app.core.llm.base import BaseLLM

# class GeminiLLM(BaseLLM):

#     def __init__(
#             self,
#             api_key: str,
#             model_name: str = "gemini-3.5-flash",
#             handler = None
#     ):
#         self.client = genai.configure(api_key=api_key)
#         self.model = genai.GenerativeModel(model_name)
#         self.model_name = model_name
#         self.handler = handler


#     def generate(
#             self,
#             system_prompt: str,
#             user_prompt: str,
#     ) -> str:
        
#         prompt = f"""
# {system_prompt}

# {user_prompt}
# """
        
#         if self.handler:
#             self.handler.log_model(
#                 provider = "gemini",
#                 model = self.model_name
#             )
        
#         response = self.model.generate_content(prompt)

#         return response.text