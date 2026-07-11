from fastapi import APIRouter, HTTPException
from app.schemas.eval import EvalRequest
from app.evaluation.harness import EvalHarness
from app.core.agent.graph import workflow


router = APIRouter(
    prefix="/eval",
    tags=["Evaluation"],
)


@router.post("")
def evaluate(
    request: EvalRequest
):

    try:

        harness = EvalHarness(workflow)

        report = harness.run(
            request.golden_set_path
        )

        return {
            "faithfulness": report.faithfulness,
            "context_recall": report.context_recall,
            "context_precision": report.context_precision,
            "intent_accuracy": report.intent_accuracy,
            "topology_recall": report.topology_recall,
            "citation_precision": report.citation_precision,
            "test_coverage_mention_rate": report.test_coverage_mention_rate,
            "passed": report.passed,
        }

    except Exception as e:

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )