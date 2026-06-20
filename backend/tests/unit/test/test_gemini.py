from app.core.llm.providers.gemini import GeminiLLM
from app.config import get_settings
from app.core.agent.nodes import generate_answer_node

settings = get_settings()

llm = GeminiLLM(
    api_key=settings.gemini_api_key
)

state = {
    "query": "What does process_payment do?",
    "assembled_context": """
Function: process_payment

File: payments.py

This function validates payment
and charges the customer.
""",
    "model_provider": "gemini",
    "model_name": "gemini-2.5-flash",

    "answer": None,
    "citations": [],
    "confidence": 0.0,
}

result = generate_answer_node(state)

print(result["answer"])


# import unittest
# from unittest.mock import MagicMock, patch
# # Replace 'your_module' with the actual filename where GeminiLLM is defined
# from app.core.llm.providers.gemini import GeminiLLM 


# class TestGeminiLLM(unittest.TestCase):

#     @patch("google.generativeai.configure")
#     @patch("google.generativeai.GenerativeModel")
#     def test_generate_success(self, mock_generative_model, mock_configure):
#         # Arrange
#         api_key = "test-api-key"
#         model_name = "gemini-3.5-flash"
#         system_prompt = "You are a helpful assistant."
#         user_prompt = "Hello, world!"
#         expected_response = "Hello! How can I help you today?"

#         # Mock the behavior of the GenerativeModel and its response
#         mock_model_instance = MagicMock()
#         mock_response = MagicMock()
#         mock_response.text = expected_response
#         mock_model_instance.generate_content.return_value = mock_response
#         mock_generative_model.return_value = mock_model_instance

#         # Act
#         llm = GeminiLLM(api_key=api_key, model_name=model_name)
#         result = llm.generate(system_prompt=system_prompt, user_prompt=user_prompt)

#         # Assert
#         mock_configure.assert_called_once_with(api_key=api_key)
#         mock_generative_model.assert_called_once_with(model_name)
        
#         expected_full_prompt = f"\n{system_prompt}\n\n{user_prompt}\n"
#         mock_model_instance.generate_content.assert_called_once_with(expected_full_prompt)
        
#         self.assertEqual(result, expected_response)


# if __name__ == "__main__":
#     unittest.main()