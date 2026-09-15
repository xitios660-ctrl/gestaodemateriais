"""API contracts for the cinematic UI. All data is isolated in memory."""
import asyncio
import csv
import io
import json
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock

import pytest
from bson import ObjectId
from fastapi.testclient import TestClient
from mongomock_motor import AsyncMongoMockClient
import server


@pytest.fixture
def app_client(monkeypatch):
    database = AsyncMongoMockClient().test_experience
    monkeypatch.setattr(server, "db", database)
    monkeypatch.setattr(server, "enforce_rate_limit", AsyncMock())
    monkeypatch.setattr(server, "put_object", AsyncMock(return_value={"path": "test/file.xlsx", "size": 4}))
    actor = {"_id": str(ObjectId()), "role": "admin", "email": "qa@example.com", "name": "QA"}
    server.app.dependency_overrides[server.get_current_user] = lambda: actor
    server.app.dependency_overrides[server.require_admin] = lambda: actor
    api = TestClient(server.app)
    yield api, database, actor
    server.app.dependency_overrides.clear()
    api.close()


def insert(collection, document):
    return asyncio.run(collection.insert_one(document)).inserted_id


def category(database, fields=None, **extra):
    return str(insert(database.categories, {"name": "Teste", "active": True, "fields": fields or [], "owners": [], "lead_time_hours": 4, **extra}))


def payload(cat, **extra):
    return {"category_id": cat, "requester": {"matricula": "QA001", "email": "qa@example.com", "empresa": "QA"}, "field_values": {}, **extra}


def submit(api, value, files=None):
    return api.post("/api/tickets", data={"payload": json.dumps(value)}, files=files)


def seed_tickets(database, cat, amount=24):
    now = datetime.now(timezone.utc)
    for i in range(amount):
        insert(database.tickets, {"ticket_number": f"CH-QA-{i:04}", "category_id": cat, "category_name": "Teste", "requester": {"email": "qa@example.com", "empresa": "=SUM(1,1)"}, "status": "concluido" if i % 3 == 0 else "aberto", "created_at": now.isoformat(), "due_at": (now + timedelta(hours=-2 if i % 2 == 0 else 2)).isoformat()})


def test_pagination_has_stable_order_and_no_duplicate_rows(app_client):
    api, db, _ = app_client
    seed_tickets(db, category(db))
    pages = [api.get("/api/tickets", params={"paginated": True, "page": page, "limit": 10}).json() for page in (1, 2, 3)]
    assert [len(p["items"]) for p in pages] == [10, 10, 4]
    assert all(p["total"] == 24 and p["pages"] == 3 for p in pages)
    assert len({row["id"] for p in pages for row in p["items"]}) == 24


def test_deadline_filters_match_dashboard_counts(app_client):
    api, db, _ = app_client
    seed_tickets(db, category(db))
    stats = api.get("/api/admin/stats").json()
    for filters, key in [({"status": "active"}, "open"), ({"overdue": True}, "overdue"), ({"due_soon": True}, "due_soon")]:
        response = api.get("/api/tickets", params={"paginated": True, **filters})
        assert response.status_code == 200
        assert response.json()["total"] == stats[key]
        assert all(row["status"] != "concluido" for row in response.json()["items"])
    assert api.get("/api/tickets", params={"paginated": True, "overdue": True, "status": "concluido"}).json()["total"] == 0


def test_report_uses_filters_escapes_formulas_and_records_audit(app_client):
    api, db, _ = app_client
    seed_tickets(db, category(db), 4)
    response = api.get("/api/admin/reports/tickets.csv", params={"status": "active"})
    assert response.status_code == 200
    rows = list(csv.reader(io.StringIO(response.content.decode("utf-8-sig")), delimiter=";"))
    assert len(rows) == 3
    assert rows[1][5] == "'=SUM(1,1)"
    assert api.get("/api/admin/audit").json()["items"][0]["action"] == "report.export"


def test_report_rejects_reversed_date_range(app_client):
    api, _, _ = app_client
    for route in ("/api/tickets", "/api/admin/reports/tickets.csv"):
        assert api.get(route, params={"start_date": "2026-09-20", "end_date": "2026-09-10"}).status_code == 400


def test_responsible_cannot_get_other_categories(app_client):
    api, db, actor = app_client
    allowed, other = category(db), category(db)
    seed_tickets(db, allowed, 2); seed_tickets(db, other, 2)
    actor.update(role="responsavel", categories=[allowed])
    assert len(api.get("/api/tickets").json()) == 2
    assert api.get("/api/tickets", params={"category_id": other}).json() == []


@pytest.mark.parametrize("value", [[], None, "wrong", {"category_id": "invalid"}])
def test_bad_payload_returns_client_error(app_client, value):
    api, _, _ = app_client
    assert submit(api, value).status_code in (400, 404)


def test_field_types_and_required_zero_value(app_client):
    api, db, _ = app_client
    cat = category(db, [{"label": "Quantidade", "type": "number", "required": True}])
    for bad in [None, "", "abc", "nan", True]:
        assert submit(api, payload(cat, field_values={"Quantidade": bad})).status_code == 400
    result = submit(api, payload(cat, field_values={"Quantidade": 0}))
    assert result.status_code == 200
    assert result.json()["field_values"]["Quantidade"] == 0
    tracking = api.get("/api/tickets/track", params={"q": result.json()["ticket_number"]}).json()
    assert len(tracking) == 1
    assert "field_values" not in tracking[0] and "requester" not in tracking[0]


def test_template_attachment_required_and_checked(app_client):
    api, db, _ = app_client
    data = payload(category(db, template_columns=["Nome"]))
    assert submit(api, data).status_code == 400
    assert submit(api, data, {"file": ("modelo.pdf", b"test", "application/pdf")}).status_code == 400
    assert submit(api, data, {"file": ("modelo.xlsx", b"", "application/octet-stream")}).status_code == 400
    assert submit(api, data, {"file": ("modelo.xlsx", b"test", "application/octet-stream")}).status_code == 200


def test_duplicate_field_labels_do_not_overwrite_request_data(app_client):
    api, _, _ = app_client
    result = api.post("/api/categories", json={"name": "Categoria", "fields": [{"label": " Item ", "type": "text"}, {"label": "item", "type": "text"}]})
    assert result.status_code == 422


def test_status_update_keeps_history_and_audit(app_client):
    api, db, _ = app_client
    ticket = submit(api, payload(category(db))).json()
    result = api.patch(f"/api/tickets/{ticket['id']}/status", json={"status": "em_andamento", "note": "Em atendimento"})
    assert result.status_code == 200
    assert len(result.json()["history"]) == 2
    assert api.get("/api/admin/audit").json()["items"][0]["action"] == "ticket.status"
