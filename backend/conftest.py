import sys

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