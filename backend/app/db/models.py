from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text
from datetime import datetime
import uuid

from app.db.session import Base


def generate_id():
    return str(uuid.uuid4())


class IndexJob(Base):
    __tablename__ = "index_jobs"

    id = Column(String, primary_key=True, default=generate_id)
    repo_path = Column(String, nullable=False)
    status = Column(String, default="pending")

    total_files = Column(Integer, default=0)
    indexed_files = Column(Integer, default=0)

    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    error_message = Column(Text, nullable=True)


class EvalRun(Base):
    __tablename__ = "eval_runs"

    id = Column(String, primary_key=True, default=generate_id)
    run_id = Column(String)

    faithfulness_score = Column(Integer)
    recall_score = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)
    passed = Column(Boolean, default=False)


class QueryLog(Base):
    __tablename__ = "query_logs"

    id = Column(String, primary_key=True, default=generate_id)
    query_text = Column(Text)

    latency_ms = Column(Integer)
    token_count = Column(Integer)

    created_at = Column(DateTime, default=datetime.utcnow)