"""AES-256-GCM protection for infrastructure credentials."""
from __future__ import annotations
import base64, os, secrets
from pathlib import Path
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

TOKEN_PREFIX = "ENCv1:"
NONCE_SIZE = 12
KEY_SIZE = 32

class SecretConfigurationError(RuntimeError): pass
class SecretDecryptionError(RuntimeError): pass

def _enc(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")

def _dec(text: str) -> bytes:
    return base64.urlsafe_b64decode((text + "=" * (-len(text) % 4)).encode("ascii"))

def generate_master_key_text() -> str:
    return _enc(AESGCM.generate_key(bit_length=256))

def _read_master_key_text() -> str:
    direct = (os.environ.get("APP_CREDENTIAL_MASTER_KEY") or "").strip()
    if direct:
        return direct
    key_file = (os.environ.get("APP_CREDENTIAL_MASTER_KEY_FILE") or "").strip()
    if key_file:
        try:
            return Path(key_file).expanduser().read_text(encoding="utf-8").strip()
        except OSError as exc:
            raise SecretConfigurationError("Não foi possível ler o arquivo da chave mestra") from exc
    raise SecretConfigurationError("Configure APP_CREDENTIAL_MASTER_KEY ou APP_CREDENTIAL_MASTER_KEY_FILE fora do Git")

def load_master_key() -> bytes:
    key = _dec(_read_master_key_text())
    if len(key) != KEY_SIZE:
        raise SecretConfigurationError("A chave mestra deve possuir 256 bits")
    return key

def _aad(purpose: str) -> bytes:
    clean = str(purpose or "").strip().upper()
    if not clean:
        raise SecretConfigurationError("Purpose obrigatório")
    return f"gestao-materiais:{clean}:v1".encode("utf-8")

def encrypt_secret(value: str, purpose: str) -> str:
    if not value:
        raise SecretConfigurationError("Valor vazio")
    nonce = secrets.token_bytes(NONCE_SIZE)
    cipher = AESGCM(load_master_key()).encrypt(nonce, str(value).encode("utf-8"), _aad(purpose))
    return TOKEN_PREFIX + _enc(nonce + cipher)

def decrypt_secret(token: str, purpose: str) -> str:
    raw = str(token or "").strip()
    if not raw.startswith(TOKEN_PREFIX):
        raise SecretDecryptionError("Credencial não está no formato ENCv1")
    try:
        payload = _dec(raw[len(TOKEN_PREFIX):])
        nonce, cipher = payload[:NONCE_SIZE], payload[NONCE_SIZE:]
        return AESGCM(load_master_key()).decrypt(nonce, cipher, _aad(purpose)).decode("utf-8")
    except InvalidTag as exc:
        raise SecretDecryptionError("Credencial criptografada não pôde ser validada") from exc
    except SecretConfigurationError:
        raise
    except Exception as exc:
        raise SecretDecryptionError("Credencial criptografada inválida") from exc

def resolve_secret(encrypted_value, plaintext_value, *, purpose: str, require_encrypted: bool = True, required: bool = True) -> str:
    encrypted = str(encrypted_value or "").strip()
    plain = str(plaintext_value or "").strip()
    if encrypted:
        return decrypt_secret(encrypted, purpose)
    if plain:
        if require_encrypted:
            raise SecretConfigurationError(f"{purpose} em texto puro foi recusado; use *_ENCRYPTED")
        return plain
    if required:
        raise SecretConfigurationError(f"Credencial {purpose} não configurada")
    return ""
