from celery import Celery
from app.config import get_settings

settings = get_settings()

celery = Celery(
    "codesage",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery.conf.update(
    task_serializer = "json",
    result_expires = 3600,
)