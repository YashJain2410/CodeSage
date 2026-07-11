from pydantic import BaseModel


class EvalRequest(BaseModel):

    golden_set_path: str