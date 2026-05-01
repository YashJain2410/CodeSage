from fastapi import FastAPI
from app.dependencies import ConfigDep

app = FastAPI()

@app.get("/")
def root(config: ConfigDep):
    return {
        "message": "CodeSage running",
        "qdrant_url": config.qdrant_url
    }