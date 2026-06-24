from dataclasses import dataclass
import json
from app.evaluation.models import EvalReport


@dataclass
class RegressionThresholds:

    max_faithfulness_drop: float = 0.05

    max_context_recall_drop: float = 0.05

    max_intent_accuracy_drop: float = 0.03

    max_topology_recall_drop: float = 0.05


class RegressionGate:

    def __init__(self, thresholds = None):
        
        self.thresholds = (
            thresholds
            or RegressionThresholds()
        )


    def compare(self, baseline, current):

        failures = []

        if (
            baseline.faithfulness
            - current.faithfulness
            >
            self.thresholds.max_faithfulness_drop
        ):

            failures.append(
                "faithfulness"
            )

        if (
            baseline.context_recall
            - current.context_recall
            >
            self.thresholds.max_context_recall_drop
        ):

            failures.append(
                "context_recall"
            )

        if (
            baseline.intent_accuracy
            - current.intent_accuracy
            >
            self.thresholds.max_intent_accuracy_drop
        ):

            failures.append(
                "intent_accuracy"
            )

        if (
            baseline.topology_recall
            - current.topology_recall
            >
            self.thresholds.max_topology_recall_drop
        ):

            failures.append(
                "topology_recall"
            )

        return {
            "passed": len(failures) == 0,
            "failures": failures,
        }
    

    def load_baseline(self, filepath):

        with open(
            filepath,
            "r"
        ) as f:
            
            return json.load(f)
        

    def baseline_report(self, data):

        return EvalReport(
            faithfulness=data["faithfulness"],
            context_recall=data["context_recall"],
            context_precision=data["context_precision"],
            intent_accuracy=data["intent_accuracy"],
            topology_recall=data["topology_recall"],
            citation_precision=0.0,
            test_coverage_mention_rate=0.0,
            avg_latency_ms=0.0,
            passed=True,
            case_results=[],
        )