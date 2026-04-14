"""Tests for ingestion API endpoints."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def client_with_ingest_mocks():
    mock_store = MagicMock()
    mock_vsm = MagicMock()
    mock_vsm.get_store.return_value = mock_store

    with (
        patch("app.main.VectorStoreManager", return_value=mock_vsm),
        patch("app.main.RAGEngine") as MockRAG,
    ):
        MockRAG.return_value = MagicMock()
        app = create_app()
        with TestClient(app) as client:
            yield client, mock_vsm


def test_ingest_github_endpoint_refreshes_documents(client_with_ingest_mocks):
    client, mock_vsm = client_with_ingest_mocks

    with patch("app.api.routes.ingest.ingest_github", return_value=7) as mock_ingest:
        response = client.post("/api/ingest/github")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["chunks_ingested"] == 7
    assert payload["clear_existing"] is True
    mock_ingest.assert_called_once()
    mock_vsm.delete_by_metadata.assert_called_once_with(
        metadata_filter={"document_type": {"$eq": "github"}},
        namespace="",
    )


def test_ingest_github_endpoint_can_skip_clear(client_with_ingest_mocks):
    client, mock_vsm = client_with_ingest_mocks

    with patch("app.api.routes.ingest.ingest_github", return_value=3):
        response = client.post("/api/ingest/github?clear_existing=false")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["clear_existing"] is False
    mock_vsm.delete_by_metadata.assert_not_called()


def test_ingest_github_endpoint_returns_500_on_failure(client_with_ingest_mocks):
    client, _mock_vsm = client_with_ingest_mocks

    with patch("app.api.routes.ingest.ingest_github", side_effect=RuntimeError("boom")):
        response = client.post("/api/ingest/github")

    assert response.status_code == 500
    assert response.json()["detail"] == "GitHub ingestion failed"


def test_ingest_all_endpoint_runs_resume_and_github(client_with_ingest_mocks):
    client, mock_vsm = client_with_ingest_mocks

    with (
        patch("app.api.routes.ingest.ingest_resume", return_value=5),
        patch("app.api.routes.ingest.ingest_github", return_value=8),
    ):
        response = client.post("/api/ingest/all?clear_namespace=true")

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["resume_chunks"] == 5
    assert payload["github_chunks"] == 8
    assert payload["total_chunks"] == 13
    assert payload["clear_namespace"] is True
    mock_vsm.delete_namespace.assert_called_once_with("")
