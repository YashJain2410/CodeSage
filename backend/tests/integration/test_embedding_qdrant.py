from app.core.indexer.embedder import CodeEmbedder
from app.core.indexer.qdrant_store import QdrantCodeStore
from app.core.parser.base import CodeUnit

store = QdrantCodeStore()
embedder = CodeEmbedder()

store.ensure_collection()

units = [

    CodeUnit(
        id="payment.py::validate_payment",
        name="validate_payment",
        qualified_name="validate_payment",

        filepath="payment.py",

        start_line=1,
        end_line=10,

        source="""
def validate_payment(card):
    return True
""",

        node_type="function",
        is_test=False,

        docstring="Validate card payments"
    ),

    CodeUnit(
        id="auth.py::login",
        name="login",
        qualified_name="login",

        filepath="auth.py",

        start_line=1,
        end_line=10,

        source="""
def login(username, password):
    return authenticate(username, password)
""",

        node_type="function",
        is_test=False,

        docstring="User authentication"
    )
]

texts = [
    unit.source
    for unit in units
]

vectors = embedder.embed_batch(texts)

store.upsert_units(units, vectors)

query = embedder.embed_text(
    "card payment processing"
)

results = store.search(query)

for r in results:

    print("\nSCORE:", r.score)
    print("PAYLOAD:", r.payload)