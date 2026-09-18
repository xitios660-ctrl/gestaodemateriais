"""SQL Server 2012+ connectivity via Microsoft ODBC Driver 17/18."""
from __future__ import annotations
import os, re
from dataclasses import dataclass
from typing import Optional
from credential_crypto import resolve_secret

DRIVER_17 = "ODBC Driver 17 for SQL Server"
DRIVER_18 = "ODBC Driver 18 for SQL Server"
TRUE_VALUES = {"1", "true", "yes", "on"}

def _bool_env(name: str, default: bool = False) -> bool:
    value = os.environ.get(name)
    return default if value is None else str(value).strip().lower() in TRUE_VALUES

def _normalize_yes_no(value: Optional[str], default: str) -> str:
    raw = str(value or default).strip().lower()
    if raw in {"1","true","yes","on"}: return "yes"
    if raw in {"0","false","no","off"}: return "no"
    if raw == "strict": return "strict"
    raise RuntimeError(f"Opção ODBC inválida: {raw}")

def _load_pyodbc():
    try:
        import pyodbc
    except ImportError as exc:
        raise RuntimeError("SQL Server exige pyodbc e ODBC Driver 17 ou 18") from exc
    return pyodbc

def installed_odbc_drivers() -> tuple[str, ...]:
    return tuple(_load_pyodbc().drivers())

def _driver_alias(value: str) -> str:
    clean = str(value or "").strip()
    low = clean.lower()
    if low in {"17","odbc17","driver17"}: return DRIVER_17
    if low in {"18","odbc18","driver18"}: return DRIVER_18
    return clean

def select_odbc_driver(preferred: Optional[str] = None) -> str:
    installed = set(installed_odbc_drivers())
    explicit = _driver_alias(preferred or "")
    if explicit and explicit.lower() != "auto":
        if explicit not in installed:
            raise RuntimeError(f"Driver ODBC não instalado: {explicit}")
        return explicit
    order = os.environ.get("SQLSERVER_ODBC_DRIVER_PREFERENCE") or "17,18"
    for item in order.split(","):
        candidate = _driver_alias(item)
        if candidate in installed:
            return candidate
    raise RuntimeError("Nenhum ODBC Driver 17/18 para SQL Server foi encontrado")

def _brace(value: str) -> str:
    return "{" + str(value).replace("}", "}}") + "}"

def _read(prefix: str, suffix: str, fallback_prefix: Optional[str], default: str = "") -> str:
    value = (os.environ.get(f"{prefix}_{suffix}") or "").strip()
    if value: return value
    if fallback_prefix:
        value = (os.environ.get(f"{fallback_prefix}_{suffix}") or "").strip()
        if value: return value
    return default

@dataclass
class SqlServerSettings:
    server: str
    port: int
    database: str
    user: str
    password: str
    driver: str
    auth_mode: str = "sql"
    encrypt: str = "no"
    trust_server_certificate: str = "yes"
    login_timeout: int = 10
    query_timeout: int = 30
    application_name: str = "GestaoMateriais"
    allow_unsupported_driver: bool = False

    @classmethod
    def from_env(cls, *, prefix: str = "SQLSERVER", database_default: Optional[str] = None, fallback_prefix: Optional[str] = None):
        server = _read(prefix, "SERVER", fallback_prefix)
        if not server and prefix == "SQLSERVER":
            server = (os.environ.get("SQLSERVER_HOST") or "").strip()
        database = _read(prefix, "DATABASE", fallback_prefix) or database_default or (os.environ.get("DB_NAME") or "gestao_materiais").strip()
        auth = _read(prefix, "AUTH_MODE", fallback_prefix, "sql").lower()
        if auth in {"windows","trusted","integrated","sspi"}: auth = "trusted"
        elif auth in {"sql","sqlauth","sql_auth"}: auth = "sql"
        else: raise RuntimeError(f"{prefix}_AUTH_MODE deve ser sql ou trusted")

        user = pwd = ""
        if auth == "sql":
            require_enc = _bool_env(f"{prefix}_REQUIRE_ENCRYPTED_CREDENTIALS", True)
            plain_user = os.environ.get(f"{prefix}_USER")
            if not plain_user and prefix == "SQLSERVER":
                plain_user = os.environ.get("SQLSERVER_USERNAME")
            user = resolve_secret(os.environ.get(f"{prefix}_USER_ENCRYPTED"), plain_user,
                                  purpose=f"{prefix}_USER", require_encrypted=require_enc, required=True)
            pwd = resolve_secret(os.environ.get(f"{prefix}_PASSWORD_ENCRYPTED"), os.environ.get(f"{prefix}_PASSWORD"),
                                 purpose=f"{prefix}_PASSWORD", require_encrypted=require_enc, required=True)

        driver = select_odbc_driver(_read(prefix, "ODBC_DRIVER", fallback_prefix, "auto"))
        encrypt = _normalize_yes_no(_read(prefix, "ENCRYPT", fallback_prefix, "no"), "no")
        trust = _normalize_yes_no(_read(prefix, "TRUST_SERVER_CERTIFICATE", fallback_prefix, "yes"), "yes")
        if encrypt == "strict" and driver != DRIVER_18:
            raise RuntimeError("Encrypt=strict exige ODBC Driver 18")
        if not server: raise RuntimeError(f"{prefix}_SERVER é obrigatório")
        if not database: raise RuntimeError(f"{prefix}_DATABASE é obrigatório")

        return cls(
            server=server,
            port=int(_read(prefix,"PORT",fallback_prefix,"1433") or "1433"),
            database=database,
            user=user,
            password=pwd,
            driver=driver,
            auth_mode=auth,
            encrypt=encrypt,
            trust_server_certificate=trust,
            login_timeout=int(_read(prefix,"LOGIN_TIMEOUT",fallback_prefix,"10")),
            query_timeout=int(_read(prefix,"QUERY_TIMEOUT",fallback_prefix,"30")),
            application_name=_read(prefix,"APPLICATION_NAME",fallback_prefix,"GestaoMateriais"),
            allow_unsupported_driver=_bool_env(f"{prefix}_ALLOW_UNSUPPORTED_DRIVER", _bool_env("SQLSERVER_ALLOW_UNSUPPORTED_DRIVER", False)),
        )

def build_connection_string(settings: SqlServerSettings) -> str:
    endpoint = settings.server
    if settings.port and "," not in endpoint and "\\" not in endpoint:
        endpoint = f"{endpoint},{settings.port}"
    parts = [
        f"DRIVER={_brace(settings.driver)}",
        f"SERVER={_brace(endpoint)}",
        f"DATABASE={_brace(settings.database)}",
        f"APP={_brace(settings.application_name)}",
        f"Encrypt={settings.encrypt}",
        f"TrustServerCertificate={settings.trust_server_certificate}",
        f"Connection Timeout={settings.login_timeout}",
        "MARS_Connection=no",
    ]
    if settings.auth_mode == "trusted":
        parts.append("Trusted_Connection=yes")
    else:
        parts += [f"UID={_brace(settings.user)}", f"PWD={_brace(settings.password)}"]
    return ";".join(parts) + ";"

def connect_sqlserver(settings: SqlServerSettings):
    pyodbc = _load_pyodbc()
    conn = pyodbc.connect(build_connection_string(settings), timeout=settings.login_timeout, autocommit=False)
    conn.timeout = settings.query_timeout
    return conn

def fetchone_dict(cursor) -> dict:
    row = cursor.fetchone()
    if row is None: return {}
    return dict(zip([x[0] for x in cursor.description or ()], row))

def fetchall_dicts(cursor) -> list[dict]:
    cols = [x[0] for x in cursor.description or ()]
    return [dict(zip(cols, row)) for row in cursor.fetchall()]

def driver_runtime_version(conn) -> tuple[int,int,str]:
    pyodbc = _load_pyodbc()
    raw = str(conn.getinfo(pyodbc.SQL_DRIVER_VER) or "")
    m = re.match(r"^(\d+)\.(\d+)", raw)
    return (int(m.group(1)), int(m.group(2)), raw) if m else (0,0,raw)

def validate_driver_server_compatibility(conn, settings: SqlServerSettings, server_major: int) -> None:
    if int(server_major or 0) != 11 or settings.allow_unsupported_driver:
        return
    major, minor, raw = driver_runtime_version(conn)
    unsupported = (
        settings.driver == DRIVER_17 and (major,minor) >= (17,11)
    ) or (
        settings.driver == DRIVER_18 and (major,minor) >= (18,2)
    )
    if unsupported:
        raise RuntimeError(
            f"Combinação não suportada para SQL Server 2012: {settings.driver} {raw}. "
            "Use ODBC Driver 17.10 ou ODBC Driver 18.0/18.1."
        )
