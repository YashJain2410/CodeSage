import mlflow
import json
import tempfile

class ExperimentTracker:

    def __init__(
            self,
            experiment_name = "codesage"
    ):
        mlflow.set_experiment(experiment_name)

    
    def track_indexing_run(self, stats, embed_model, model_provider = None, model_name = None):

        with mlflow.start_run():

            mlflow.log_param(
                "embedding_model",
                embed_model
            )

            if model_provider:
                mlflow.log_param(
                    "model_provider",
                    model_provider
                )

            if model_name:
                mlflow.log_param(
                    "model_name",
                    model_name
                )

            mlflow.log_metric(
                "units",
                stats["units"]
            )

            mlflow.log_metric(
                "nodes",
                stats["nodes"]
            )

            mlflow.log_metric(
                "edges",
                stats["edges"]
            )

            print("Run tracked")


    def log_embedding_stats(
            self,
            embedding_dim,
            total_embeddings,
            batch_size
    ):
        mlflow.log_param(
            "embedding_dim",
            embedding_dim
        )

        mlflow.log_param(
            "batch_size",
            batch_size
        )

        mlflow.log_metric(
            "total_embeddings",
            total_embeddings
        )


    def log_retrieval_metrics(
            self,
            latency_ms,
            top_k,
            results_count
    ):
        mlflow.log_metric(
            "retrieval_latency_ms",
            latency_ms
        )

        mlflow.log_metric(
            "top_k",
            top_k
        )

        mlflow.log_metric(
            "results_count",
            results_count
        )


    def log_artifact(self, filepath):
        
        mlflow.log_artifact(filepath)


    def log_evaluation_report(self, report, model_provider, model_name):

        artifact_data = []

        for case in report.case_results:

            artifact_data.append(
                {
                    "query": case.query,
                    "expected_intent": case.expected_intent,
                    "predicted_intent": case.predicted_intent,
                    "latency_ms": case.latency_ms,
                }
            )

        with tempfile.NamedTemporaryFile(
            mode="w",
            suffix=".json",
            delete=False,
        ) as f:
            
            json.dump(
                artifact_data,
                f,
                indent=2
            )

            artifact_path = f.name

        with mlflow.start_run():

            mlflow.log_param(
                "model_provider",
                model_provider
            )

            mlflow.log_param(
                "model_name",
                model_name
            )

            mlflow.log_metric(
                "faithfulness",
                report.faithfulness
            )

            mlflow.log_metric(
                "context_recall",
                report.context_recall
            )

            mlflow.log_metric(
                "context_precision",
                report.context_precision
            )

            mlflow.log_metric(
                "intent_accuracy",
                report.intent_accuracy
            )

            mlflow.log_metric(
                "topology_recall",
                report.topology_recall
            )

            mlflow.log_metric(
                "citation_precision",
                report.citation_precision
            )

            mlflow.log_metric(
                "test_coverage_mention_rate",
                report.test_coverage_mention_rate
            )

            mlflow.log_metric(
                "avg_latency_ms",
                report.avg_latency_ms
            )

            mlflow.log_artifact(
                artifact_path
            )