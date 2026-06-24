import json
import time

from app.evaluation.models import ( EvalCaseResult, EvalReport )
from app.evaluation.metrics import ( intent_accuracy, topology_recall, citation_precision, test_coverage_mention_rate )
from app.evaluation.ragas_adapter import build_ragas_dataset
from app.evaluation.ragas_evaluator import RagasEvaluator
from app.core.indexer.experiment_tracker import ExperimentTracker
from app.evaluation.regression_gate import RegressionGate


class EvalHarness:

    def __init__(self, graph):

        self.graph = graph
        self.ragas = RagasEvaluator()
        self.tracker = ExperimentTracker()


    def load_golden_set(self, filepath):

        with open(filepath, "r") as f:
            return json.load(f)
        

    def evaluate_case(self, case):

        start = time.time()

        result = self.graph.invoke(
            {
                "query": case["query"],
                "model_provider": "gemini",
                "model_name": "gemini-3.5-flash",
            }
        )

        latency_ms = (
            time.time() - start
        ) * 1000

        return EvalCaseResult(
            query=case["query"],

            expected_intent=
                case["intent"],

            predicted_intent=
                result["intent"].value,

            expected_func_ids=
                case["expected_func_ids"],

            retrieved_func_ids=
                result.get(
                    "retrieved_func_ids",
                    []
                ),

            answer=
                result["answer"],

            citations=
                result.get(
                    "citations",
                    []
                ),

            should_mention_test=
                case.get(
                    "should_mention_test",
                    False
                ),

            latency_ms=
                latency_ms,
        )
    

    def run(self, golden_set_path):

        cases = self.load_golden_set(golden_set_path)

        results = []

        for case in cases:

            results.append(
                self.evaluate_case(case)
            )

        intent_score = intent_accuracy(results)
        topology_score = topology_recall(results)
        citation_score = citation_precision(results)
        test_score = (
            test_coverage_mention_rate(results)
        )

        dataset = build_ragas_dataset(results)

        ragas_scores = (
            self.ragas.evaluate_dataset(dataset)
        )

        avg_latency_ms = (
            sum(
                r.latency_ms
                for r in results
            )
            / len(results)
        )

        report = EvalReport(
            faithfulness=
                ragas_scores[
                    "faithfulness"
                ],

            context_recall=
                ragas_scores[
                    "context_recall"
                ],

            context_precision=
                ragas_scores[
                    "context_precision"
                ],

            intent_accuracy=
                intent_score,

            topology_recall=
                topology_score,

            citation_precision=
                citation_score,

            test_coverage_mention_rate=
                test_score,

            passed=False,

            case_results=results,

            avg_latency_ms=avg_latency_ms,
        )

        gate = RegressionGate()

        baseline_data = gate.load_baseline("baseline.json")

        baseline_report = (
            gate.baseline_report(
                baseline_data
            )
        )

        gate_result = gate.compare(
            baseline_report,
            report,
        )

        report.passed = (
            gate_result["passed"]
        )

        self.tracker.log_evaluation_report(
            report=report,
            model_provider="gemini",
            model_name="gemini-3.5-flash",
        )

        return report