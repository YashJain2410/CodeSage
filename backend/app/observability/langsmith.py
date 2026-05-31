from langchain_core.callbacks import BaseCallbackHandler


class CodeSageCallbackHandler(BaseCallbackHandler):

    def __init__(self):

        self.retrieval_latency = 0
        self.chunk_count = 0
        self.token_count = 0
        self.intent_confidence = 0.0


    def log_retrieval(
            self,
            latency_ms,
            chunks
    ):
        
        self.retrieval_latency = latency_ms
        self.chunk_count = chunks


    def log_intent(self, confidence):

        self.intent_confidence = confidence


    def log_token(self, token_count: int):
        
        self.token_count = token_count


    def log_confidence(self, confidence: float):
        self.intent_confidence = confidence