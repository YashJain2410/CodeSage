from types import SimpleNamespace
from unittest.mock import Mock

from fastapi import FastAPI
from fastapi.testclient import TestClient
import pytest
from langgraph.graph import StateGraph, START, END
from langsmith import Client

from app.api.routes.metrics import router
from app.observability.http import setup_request_metrics
from app.observability import langsmith as tracing
from app.observability.metrics import REQUEST_COUNT, REQUEST_LATENCY


def test_request_metrics_include_routes_statuses_and_failures():
    app = FastAPI()
    setup_request_metrics(app)
    app.include_router(router)

    @app.get("/items/{item_id}")
    def item(item_id: str):
        return {"id": item_id}

    @app.get("/failure")
    def failure():
        raise RuntimeError("test failure")

    labels = {"method": "GET", "endpoint": "/items/{item_id}", "status": "200"}
    before = REQUEST_COUNT.labels(**labels)._value.get()
    count = REQUEST_LATENCY._sum.get()

    with TestClient(app, raise_server_exceptions=False) as client:
        assert client.get("/items/123").status_code == 200
        assert client.get("/items/456").status_code == 200
        assert client.get("/missing").status_code == 404
        assert client.get("/failure").status_code == 500
        metrics = client.get("/metrics")

    assert REQUEST_COUNT.labels(**labels)._value.get() == before + 2
    assert REQUEST_COUNT.labels(method="GET", endpoint="/failure", status="500")._value.get() >= 1
    assert REQUEST_COUNT.labels(method="GET", endpoint="unmatched", status="404")._value.get() >= 1
    assert REQUEST_LATENCY._sum.get() > count
    assert "request_count_total" in metrics.text
    assert "/items/123" not in metrics.text
    assert 'endpoint="/metrics"' not in metrics.text


def test_langgraph_exports_parent_and_child_runs(monkeypatch):
    client = Client(api_url="http://localhost:1984", api_key="test", auto_batch_tracing=False)
    create = Mock()
    update = Mock()
    monkeypatch.setattr(Client, "create_run", create)
    monkeypatch.setattr(Client, "update_run", update)
    monkeypatch.setattr(tracing, "get_trace_client", lambda: client)
    monkeypatch.setattr(tracing, "get_settings", lambda: SimpleNamespace(
        langsmith_tracing=True, langsmith_project="codesage-test",
    ))

    workflow = StateGraph(dict)
    workflow.add_node("synthetic_answer", lambda state: {"answer": "monitoring check"})
    workflow.add_edge(START, "synthetic_answer")
    workflow.add_edge("synthetic_answer", END)

    with tracing.query_tracing():
        result = workflow.compile().invoke({"question": "synthetic check"})

    assert result["answer"] == "monitoring check"
    assert create.call_count >= 2
    assert any(call.kwargs.get("name") == "synthetic_answer" for call in create.call_args_list)
    assert all(call.kwargs.get("session_name") == "codesage-test" for call in create.call_args_list)
    assert update.called


def test_disabled_tracing_needs_no_client(monkeypatch):
    monkeypatch.setattr(tracing, "get_settings", lambda: SimpleNamespace(
        langsmith_tracing=False, langsmith_project="codesage-test",
    ))
    client = Mock(side_effect=AssertionError("Tracing should be disabled"))
    monkeypatch.setattr(tracing, "get_trace_client", client)
    with tracing.query_tracing():
        pass
    client.assert_not_called()


def test_enabled_tracing_requires_a_key(monkeypatch):
    monkeypatch.setattr(tracing, "get_settings", lambda: SimpleNamespace(langsmith_api_key=None))
    tracing.get_trace_client.cache_clear()
    with pytest.raises(ValueError, match="LANGSMITH_API_KEY"):
        tracing.get_trace_client()
