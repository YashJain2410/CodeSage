from unittest.mock import patch

from fastapi.testclient import TestClient


def test_deployed_app_exposes_liveness_without_claiming_database_health():
    # A process can be alive while Qdrant/PostgreSQL are unavailable.
    with patch('app.core.indexer.qdrant_store.QdrantCodeStore.__init__', return_value=None), \
         patch('app.core.indexer.experiment_tracker.ExperimentTracker.__init__', return_value=None):
        from app.main import app
    client = TestClient(app)
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {'status': 'ok'}
    assert '/health' in client.get('/openapi.json').json()['paths']
