from app.evaluation.models import EvalCaseResult
import re

def intent_accuracy(results: list[EvalCaseResult]) -> float:

    if not results:
        return 0.0
    
    correct = sum(
        1
        for r in results
        if r.expected_intent
        == r.predicted_intent
    )

    return correct / len(results)


def topology_recall(results: list[EvalCaseResult]) -> float:

    if not results:
        return 0.0
    
    recalls = []

    for result in results:

        expected = set(result.expected_func_ids)
        retrieved = set(result.retrieved_func_ids)

        if not expected:
            continue

        recalls.append(
            len(expected & retrieved) / len(expected)
        )

    return (
        sum(recalls) / len(recalls)
        if recalls
        else 0.0
    )


def test_coverage_mention_rate(results: list[EvalCaseResult]) -> float:

    eligible = [
        r
        for r in results
        if getattr(
            r,
            "should_mention_test",
            False
        )
    ]

    if not eligible:
        return 0.0
    
    mentioned = 0

    for r in eligible:

        if "test" in r.answer.lower():
            mentioned += 1

    return mentioned / len(eligible)


CITATION_PATTERN = re.compile(r"([^\s:]+\.py):(\d+)")

def citation_precision(results: list[EvalCaseResult]) -> float:

    if not results:
        return 0.0
    
    total = 0
    valid = 0

    for result in results:

        for citation in result.citations:

            total += 1

            if CITATION_PATTERN.match(citation):
                valid += 1

    if total == 0:
        return 0.0
    
    return valid / total