from dataclasses import dataclass

@dataclass
class EvalCaseResult:

    query: str

    expected_intent: str
    predicted_intent: str

    expected_func_ids: list[str]
    retrieved_func_ids: list[str]

    answer: str

    citations: list[str]

    should_mention_test: bool = False

    latency_ms: float = 0.0


@dataclass
class EvalReport:

    faithfulness: float
    context_recall: float
    context_precision: float
    intent_accuracy: float
    topology_recall: float
    citation_precision: float
    test_coverage_mention_rate: float
    passed: bool
    case_results: list[EvalCaseResult]
    avg_latency_ms: float = 0.0