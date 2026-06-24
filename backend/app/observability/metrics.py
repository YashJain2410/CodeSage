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

QUERY_COUNT = Counter(
    "codesage_queries_total",
    "Total CodeSage queries"
)

INTENT_COUNT = Counter(
    "codesage_intent_total",
    "Intent distribution",
    ["intent"]
)

RETRIEVAL_LATENCY = Histogram(
    "codesage_retrieval_latency_ms",
    "Hybrid retrieval latency"
)

RETRIEVED_DOCUMENTS = Histogram(
    "codesage_retrieved_documents",
    "Documents returned from retrieval"
)

GRAPH_EXPANSION_SIZE = Histogram(
    "codesage_graph_expansion_size",
    "Number of nodes added by graph expansion"
)

RERANK_LATENCY = Histogram(
    "codesage_rerank_latency_ms",
    "Cross encoder reranking latency"
)

CONTEXT_TOKENS = Histogram(
    "codesage_context_tokens",
    "Context window size in tokens"
)

LLM_LATENCY = Histogram(
    "codesage_llm_latency_ms",
    "LLM response latency"
)

MODEL_USAGE = Counter(
    "codesage_model_usage_total",
    "Model usage",
    ["provider", "model"]
)

AGENT_RETRIES = Counter(
    "codesage_agent_retries_total",
    "Agent retry count"
)

CONFIDENCE_SCORE = Histogram(
    "codesage_confidence_score",
    "Answer confidence"
)

EVAL_RUNS = Counter(
    "codesage_eval_runs_total",
    "Evaluation runs"
)

EVAL_FAITHFULNESS = Histogram(
    "codesage_eval_faithfulness",
    "Faithfulness scores"
)

EVAL_INTENT_ACCURACY = Histogram(
    "codesage_eval_intent_accuracy",
    "Intent accuracy scores"
)