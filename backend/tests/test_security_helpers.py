import pytest

from fastapi import HTTPException
from server import (
    MIN_PASSWORD_LENGTH,
    _assert_safe_email,
    _safe_local_path,
    as_object_id,
    ser_category_public,
    ser_ticket_public,
)


def test_public_category_hides_internal_owner_emails():
    doc = {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Suprimentos",
        "owners": ["owner@example.com"],
        "fields": [],
        "active": True,
    }
    result = ser_category_public(doc)
    assert "owners" not in result
    assert result["name"] == "Suprimentos"


def test_public_ticket_exposes_only_tracking_fields():
    doc = {
        "_id": "507f1f77bcf86cd799439011",
        "ticket_number": "CH-2026-0001",
        "category_name": "Suprimentos",
        "category_icon": "PackagePlus",
        "status": "aberto",
        "lead_time_hours": 12,
        "created_at": "2026-09-15T00:00:00+00:00",
        "due_at": "2026-09-15T12:00:00+00:00",
        "requester": {"email": "private@example.com", "matricula": "123"},
        "field_values": {"Segredo": "interno"},
        "email_log": [{"to": "owner@example.com"}],
        "file": {"storage_path": "secret/file.pdf"},
    }
    result = ser_ticket_public(doc)
    assert result["ticket_number"] == "CH-2026-0001"
    assert result["status_label"] == "Aberto"
    assert "requester" not in result
    assert "field_values" not in result
    assert "email_log" not in result
    assert "file" not in result


def test_safe_local_path_rejects_traversal():
    with pytest.raises(ValueError):
        _safe_local_path("../../etc/passwd")



def test_invalid_object_id_becomes_safe_404():
    with pytest.raises(HTTPException) as exc:
        as_object_id("not-an-object-id", "Item não encontrado")
    assert exc.value.status_code == 404
    assert exc.value.detail == "Item não encontrado"


def test_valid_object_id_is_accepted():
    oid = as_object_id("507f1f77bcf86cd799439011")
    assert str(oid) == "507f1f77bcf86cd799439011"


def test_password_policy_is_not_trivially_short():
    assert MIN_PASSWORD_LENGTH >= 8


def test_email_guard_rejects_insecure_http_links():
    with pytest.raises(ValueError):
        _assert_safe_email(
            "Aviso",
            '<p><a href="http://example.com/reset">Redefinir</a></p>',
        )


def test_email_guard_accepts_safe_https_link():
    _assert_safe_email(
        "Aviso",
        '<p><a href="https://example.com/reset">Redefinir acesso</a></p>',
    )
