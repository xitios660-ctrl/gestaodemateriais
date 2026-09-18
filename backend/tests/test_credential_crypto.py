import base64
import pytest

from credential_crypto import (
    SecretConfigurationError,
    SecretDecryptionError,
    decrypt_secret,
    encrypt_secret,
    resolve_secret,
)


def _key():
    return base64.urlsafe_b64encode(bytes(range(32))).decode("ascii").rstrip("=")


def test_encrypt_roundtrip_is_bound_to_purpose(monkeypatch):
    monkeypatch.setenv("APP_CREDENTIAL_MASTER_KEY", _key())
    token = encrypt_secret("usuario_sql", "SQLSERVER_USER")
    assert token.startswith("ENCv1:")
    assert decrypt_secret(token, "SQLSERVER_USER") == "usuario_sql"
    with pytest.raises(SecretDecryptionError):
        decrypt_secret(token, "SQLSERVER_PASSWORD")


def test_plaintext_is_rejected_when_encryption_is_required(monkeypatch):
    monkeypatch.setenv("APP_CREDENTIAL_MASTER_KEY", _key())
    with pytest.raises(SecretConfigurationError):
        resolve_secret(
            "",
            "segredo-em-claro",
            purpose="SQLSERVER_PASSWORD",
            require_encrypted=True,
            required=True,
        )
