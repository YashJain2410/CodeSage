from app.workers.celery_app import celery
import time

from app.workers.celery_app import celery

from app.core.indexer.pipeline import ( IndexingPipeline )

@celery.task(bind=True)
def index_repository(self, repo_path: str, job_id: str):
    print(f"Starting indexing {repo_path}")

    for i in range(5):
        time.sleep(1)
        print(f"Progress: {i+1}/5")

    return {"status": "done", "repo": repo_path}

@celery.task(bind = True)
def index_repository_task(self, repo_path):

    pipeline = IndexingPipeline()
    stats = pipeline.index_repository(repo_path)
    return stats