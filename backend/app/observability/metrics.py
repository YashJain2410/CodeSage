from prometheus_client import Counter, Histogram

REQUEST_COUNT = Counter(
    "request_count",
    "Total API Requests",
    ["method", "endpoint", "status"]
)

REQUEST_LATENCY = Histogram(
    "request_latency_seconds",
    "Request Latency"
)

INTENT_CLASSIFICATION_METHOD = Counter(
    "intent_classification_method",
    "Intent classification method",
    ["method"]
)