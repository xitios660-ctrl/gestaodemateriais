"""Backend tests for Central de Serviços (Help Desk portal)."""
import io
import json
import os
import time

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ticket-builder-14.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("TEST_ADMIN_EMAIL") or os.environ.get("ADMIN_EMAIL")
ADMIN_PASSWORD = os.environ.get("TEST_ADMIN_PASSWORD") or os.environ.get("ADMIN_PASSWORD")


@pytest.fixture(scope="session")
def admin_session():
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        pytest.skip("Credenciais de teste admin não configuradas")
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def categories():
    r = requests.get(f"{API}/categories", timeout=30)
    assert r.status_code == 200
    return r.json()


# --- Public/health ---
def test_root():
    r = requests.get(f"{API}/", timeout=30)
    assert r.status_code == 200


def test_list_categories_public(categories):
    assert isinstance(categories, list)
    assert len(categories) >= 5
    names = {c["name"] for c in categories}
    for expected in ["Informática", "Acessos", "Férias", "Criação de Centros", "Reabastecimento"]:
        assert any(expected in n for n in names), f"missing category matching '{expected}'"
    # each category has id and fields
    for c in categories:
        assert "id" in c and "_id" not in c
        assert "fields" in c


# --- Auth ---
def test_login_invalid():
    email = ADMIN_EMAIL or "invalid-test@example.com"
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong-xyz"}, timeout=30)
    assert r.status_code == 401


def test_auth_me_requires_auth():
    r = requests.get(f"{API}/auth/me", timeout=30)
    assert r.status_code == 401


def test_auth_me_ok(admin_session):
    r = admin_session.get(f"{API}/auth/me", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == ADMIN_EMAIL
    assert data["role"] == "admin"


def test_login_sets_httponly_cookies():
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        pytest.skip("Credenciais de teste admin não configuradas")
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200
    cookies_names = {c.name for c in s.cookies}
    assert "access_token" in cookies_names
    assert "refresh_token" in cookies_names


# --- Ticket creation ---
def test_ticket_missing_requester_fields(categories):
    cat = categories[0]
    payload = {"category_id": cat["id"], "requester": {"matricula": "", "email": "", "empresa": ""}, "field_values": {}}
    r = requests.post(f"{API}/tickets", data={"payload": json.dumps(payload)}, timeout=30)
    assert r.status_code == 400


def test_ticket_missing_category():
    payload = {"requester": {"matricula": "123", "email": "a@a.com", "empresa": "X"}, "field_values": {}}
    r = requests.post(f"{API}/tickets", data={"payload": json.dumps(payload)}, timeout=30)
    assert r.status_code == 400


@pytest.fixture(scope="session")
def created_ticket(categories):
    cat = next(c for c in categories if "Informática" in c["name"])
    field_values = {}
    for f in cat.get("fields", []):
        if not f.get("required"):
            continue
        if f["type"] == "select":
            field_values[f["label"]] = f["options"][0]
        elif f["type"] == "checkbox":
            field_values[f["label"]] = True
        elif f["type"] == "date":
            field_values[f["label"]] = "2026-01-15"
        else:
            field_values[f["label"]] = "TEST value"
    payload = {
        "category_id": cat["id"],
        "requester": {"matricula": "TEST_001", "email": "test_user@example.com", "empresa": "TEST Corp"},
        "field_values": field_values,
    }
    files = {
        "payload": (None, json.dumps(payload)),
        "file": ("hello.txt", b"hello world content", "text/plain"),
    }
    r = requests.post(f"{API}/tickets", files=files, timeout=60)
    assert r.status_code == 200, r.text
    t = r.json()
    assert t["ticket_number"].startswith("CH-2026-")
    assert t["status"] == "aberto"
    assert t["lead_time_hours"] > 0
    assert t["file"] is not None
    assert "storage_path" in t["file"]
    return t


def test_ticket_created(created_ticket):
    assert created_ticket["ticket_number"]


def test_track_by_number(created_ticket):
    r = requests.get(f"{API}/tickets/track", params={"q": created_ticket["ticket_number"]}, timeout=30)
    assert r.status_code == 200
    lst = r.json()
    assert any(t["ticket_number"] == created_ticket["ticket_number"] for t in lst)


def test_track_by_email(created_ticket):
    r = requests.get(f"{API}/tickets/track", params={"q": "test_user@example.com"}, timeout=30)
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_track_by_matricula(created_ticket):
    r = requests.get(f"{API}/tickets/track", params={"q": "TEST_001"}, timeout=30)
    assert r.status_code == 200
    assert len(r.json()) >= 1


# --- Admin flows ---
def test_admin_list_tickets(admin_session, created_ticket):
    r = admin_session.get(f"{API}/tickets", timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_admin_search_ticket(admin_session, created_ticket):
    r = admin_session.get(f"{API}/tickets", params={"search": created_ticket["ticket_number"]}, timeout=30)
    assert r.status_code == 200
    assert any(t["ticket_number"] == created_ticket["ticket_number"] for t in r.json())


def test_admin_stats(admin_session):
    r = admin_session.get(f"{API}/admin/stats", timeout=30)
    assert r.status_code == 200
    data = r.json()
    for k in ("total", "open", "done", "by_category", "by_status"):
        assert k in data


def test_update_status_and_track_reflects(admin_session, created_ticket):
    r = admin_session.patch(
        f"{API}/tickets/{created_ticket['id']}/status",
        json={"status": "em_andamento", "note": "trabalhando"},
        timeout=30,
    )
    assert r.status_code == 200
    assert r.json()["status"] == "em_andamento"
    # Track reflects
    r2 = requests.get(f"{API}/tickets/track", params={"q": created_ticket["ticket_number"]}, timeout=30)
    assert r2.status_code == 200
    found = next(t for t in r2.json() if t["ticket_number"] == created_ticket["ticket_number"])
    assert found["status"] == "em_andamento"


def test_download_file_requires_auth(created_ticket):
    r = requests.get(f"{API}/files/{created_ticket['file']['storage_path']}", timeout=30)
    assert r.status_code == 401


def test_download_file_ok(admin_session, created_ticket):
    r = admin_session.get(f"{API}/files/{created_ticket['file']['storage_path']}", timeout=60)
    assert r.status_code == 200
    assert b"hello world" in r.content


def test_email_log_field(admin_session, created_ticket):
    # give the background task a bit of time
    time.sleep(3)
    r = admin_session.get(f"{API}/tickets/{created_ticket['id']}", timeout=30)
    assert r.status_code == 200
    assert "email_log" in r.json()


# --- Category CRUD ---
def test_category_crud(admin_session):
    payload = {
        "name": "TEST_Cat",
        "icon": "Laptop",
        "description": "temp",
        "lead_time_hours": 6,
        "owners": ["test_owner@example.com"],
        "fields": [{"id": "f1", "label": "Descrição", "type": "textarea", "required": True, "options": []}],
        "active": True,
    }
    r = admin_session.post(f"{API}/categories", json=payload, timeout=30)
    assert r.status_code == 200, r.text
    cid = r.json()["id"]

    # update
    payload["name"] = "TEST_Cat_Updated"
    r = admin_session.put(f"{API}/categories/{cid}", json=payload, timeout=30)
    assert r.status_code == 200
    assert r.json()["name"] == "TEST_Cat_Updated"

    # get single
    r = admin_session.get(f"{API}/categories/{cid}", timeout=30)
    assert r.status_code == 200

    # delete
    r = admin_session.delete(f"{API}/categories/{cid}", timeout=30)
    assert r.status_code == 200

    # confirm gone
    r = admin_session.get(f"{API}/categories/{cid}", timeout=30)
    assert r.status_code == 404


def test_category_create_requires_auth():
    r = requests.post(f"{API}/categories", json={"name": "no-auth"}, timeout=30)
    assert r.status_code == 401
