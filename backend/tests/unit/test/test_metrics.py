from app.observability.metrics import REQUEST_COUNT

REQUEST_COUNT.labels(method="GET", endpoint="/", status="200").inc()