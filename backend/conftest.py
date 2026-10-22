import sys

# These files are manual service checks, not pytest tests. They make live calls
# during import, so run them directly when their services are configured.
collect_ignore = [
    "tests/unit/test/test_celery.py",
    "tests/unit/test/test_embedding.py",
    "tests/unit/test/test_gemini.py",
    "tests/integration/test_embedding_qdrant.py",
]

def pytest_sessionstart(session):
    print("\n========== PYTEST START ==========")

    if "app" in sys.modules:
        app = sys.modules["app"]
        print("app module:", app)
        print("file:", getattr(app, "__file__", None))
        print("path:", getattr(app, "__path__", None))
    else:
        print("app not imported yet")

    print("=================================\n")
