import mlflow

class ExperimentTracker:

    def __init__(
            self,
            experiment_name = "codesage"
    ):
        mlflow.set_experiment(experiment_name)

    
    def track_indexing_run(self, stats, embed_model):

        with mlflow.start_run():

            mlflow.log_param(
                "embedding_model",
                embed_model
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