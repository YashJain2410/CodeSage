from app.workers.celery_app import celery
import time

@celery.task(bind=True)
def index_repository(self, repo_path: str, job_id: str):
    print(f"Starting indexing {repo_path}")

    for i in range(5):
        time.sleep(1)
        print(f"Progress: {i+1}/5")

    return {"status": "done", "repo": repo_path}