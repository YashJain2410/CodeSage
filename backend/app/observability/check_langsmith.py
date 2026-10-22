from time import sleep
from uuid import uuid4

from langchain_core.tracers.langchain import wait_for_all_tracers
from langgraph.graph import END, START, StateGraph

from app.config import get_settings
from app.observability.langsmith import get_trace_client, query_tracing


def check_langsmith():
    settings = get_settings()

    if not settings.langsmith_tracing:
        raise SystemExit("Set LANGSMITH_TRACING=true in .env before running this check.")

    client = get_trace_client()
    run_id = uuid4()
    workflow = StateGraph(dict)
    workflow.add_node("synthetic_answer", lambda state: {"answer": "monitoring check"})
    workflow.add_edge(START, "synthetic_answer")
    workflow.add_edge("synthetic_answer", END)

    with query_tracing():
        workflow.compile().invoke(
            {"question": "synthetic monitoring check"},
            config={"run_name": "CodeSage monitoring check", "run_id": run_id},
        )

    wait_for_all_tracers()
    client.flush()

    for _ in range(10):
        runs = list(client.list_runs(trace_id=run_id))
        root = next((run for run in runs if run.id == run_id), None)
        child = next((run for run in runs if run.parent_run_id == run_id), None)

        if root and child and root.outputs == {"answer": "monitoring check"}:
            print(f"LangSmith parent and child traces verified: {run_id}")
            return

        sleep(1)

    raise RuntimeError("LangSmith did not return the completed parent and child traces.")


if __name__ == "__main__":
    check_langsmith()
