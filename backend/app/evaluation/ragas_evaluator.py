from ragas import evaluate

from ragas.metrics import (
    _faithfulness,
    _context_recall,
    _context_precision,
)


class RagasEvaluator:
    
    def evaluate_dataset(self, dataset):

        scores = evaluate(
            dataset,
            metrics=[
                _faithfulness,
                _context_recall,
                _context_precision,
            ]
        )

        return {
            "faithfulness":
                float(
                    scores["faithfulness"]
                ),

            "context_recall":
                float(
                    scores["context_recall"]
                ),

            "context_precision":
                float(
                    scores["context_precision"]
                ),
        }