import asyncio
import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient


COLLECTION_NAMES = (
    "users",
    "categories",
    "tickets",
    "login_attempts",
    "rate_limits",
    "password_reset_tokens",
    "password_reset_requests",
    "audit_logs",
    "email_events",
    "counters",
    "system_settings",
    "material_catalogs",
)


def _safe_identifier(value: str, fallback: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_]", "_", str(value or ""))
    return cleaned or fallback


def _normalize_scalar(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.astimezone(timezone.utc).isoformat()
    return value


def _json_default(value: Any):
    normalized = _normalize_scalar(value)
    if normalized is not value:
        return normalized
    raise TypeError(f"Tipo não serializável: {type(value).__name__}")


def _serialize_doc(doc: dict) -> str:
    return json.dumps(doc, ensure_ascii=False, separators=(",", ":"), default=_json_default)


def _deserialize_doc(raw: str) -> dict:
    doc = json.loads(raw)
    value = doc.get("_id")
    if isinstance(value, str) and ObjectId.is_valid(value):
        doc["_id"] = ObjectId(value)
    return doc


def _get_path(doc: Any, path: str, default=None):
    current = doc
    for part in str(path).split("."):
        if not isinstance(current, dict) or part not in current:
            return default
        current = current[part]
    return current


def _set_path(doc: dict, path: str, value: Any) -> None:
    parts = str(path).split(".")
    current = doc
    for part in parts[:-1]:
        child = current.get(part)
        if not isinstance(child, dict):
            child = {}
            current[part] = child
        current = child
    current[parts[-1]] = value


def _unset_path(doc: dict, path: str) -> None:
    parts = str(path).split(".")
    current = doc
    for part in parts[:-1]:
        current = current.get(part)
        if not isinstance(current, dict):
            return
    current.pop(parts[-1], None)


def _cmp_value(value: Any):
    value = _normalize_scalar(value)
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True, default=_json_default)
    return str(value)


def _equals(left: Any, right: Any) -> bool:
    left = _normalize_scalar(left)
    right = _normalize_scalar(right)
    if isinstance(left, list) and not isinstance(right, list):
        return any(_equals(item, right) for item in left)
    return left == right


def _compare(left: Any, right: Any, op: str) -> bool:
    left = _cmp_value(left)
    right = _cmp_value(right)
    if left is None:
        return False
    try:
        if op == "$gt":
            return left > right
        if op == "$gte":
            return left >= right
        if op == "$lt":
            return left < right
        if op == "$lte":
            return left <= right
    except TypeError:
        left, right = str(left), str(right)
        if op == "$gt":
            return left > right
        if op == "$gte":
            return left >= right
        if op == "$lt":
            return left < right
        if op == "$lte":
            return left <= right
    return False


def _match_condition(candidate: Any, condition: Any) -> bool:
    if not isinstance(condition, dict) or not any(str(k).startswith("$") for k in condition):
        return _equals(candidate, condition)

    regex_options = str(condition.get("$options") or "")
    for op, expected in condition.items():
        if op == "$options":
            continue
        if op == "$in":
            values = list(expected or [])
            if isinstance(candidate, list):
                if not any(any(_equals(item, target) for target in values) for item in candidate):
                    return False
            elif not any(_equals(candidate, target) for target in values):
                return False
        elif op == "$nin":
            values = list(expected or [])
            if isinstance(candidate, list):
                if any(any(_equals(item, target) for target in values) for item in candidate):
                    return False
            elif any(_equals(candidate, target) for target in values):
                return False
        elif op == "$ne":
            if _equals(candidate, expected):
                return False
        elif op in {"$gt", "$gte", "$lt", "$lte"}:
            if not _compare(candidate, expected, op):
                return False
        elif op == "$regex":
            flags = re.IGNORECASE if "i" in regex_options.lower() else 0
            if re.search(str(expected), str(candidate or ""), flags) is None:
                return False
        elif op == "$exists":
            exists = candidate is not None
            if exists != bool(expected):
                return False
        else:
            return False
    return True


def _matches(doc: dict, query: Optional[dict]) -> bool:
    query = query or {}
    for key, expected in query.items():
        if key == "$or":
            if not any(_matches(doc, part) for part in expected or []):
                return False
            continue
        if key == "$and":
            if not all(_matches(doc, part) for part in expected or []):
                return False
            continue
        candidate = _get_path(doc, key, None)
        if not _match_condition(candidate, expected):
            return False
    return True


def _project(doc: dict, projection: Optional[dict]) -> dict:
    if not projection:
        return dict(doc)

    include = [k for k, v in projection.items() if bool(v) and k != "_id"]
    exclude = [k for k, v in projection.items() if not bool(v)]

    if include:
        result = {}
        if projection.get("_id", 1) and "_id" in doc:
            result["_id"] = doc["_id"]
        for path in include:
            value = _get_path(doc, path, None)
            if value is not None:
                _set_path(result, path, value)
        return result

    result = dict(doc)
    for path in exclude:
        _unset_path(result, path)
    return result


def _sort_value(value: Any):
    value = _cmp_value(value)
    if value is None:
        return (1, 0, "")
    if isinstance(value, bool):
        return (0, 0, int(value))
    if isinstance(value, (int, float)):
        return (0, 1, value)
    return (0, 2, str(value))


def _apply_sort(docs: list[dict], spec) -> list[dict]:
    if not spec:
        return docs
    if isinstance(spec, str):
        spec = [(spec, 1)]
    elif isinstance(spec, tuple) and len(spec) == 2 and isinstance(spec[0], str):
        spec = [spec]
    spec = list(spec)
    for field, direction in reversed(spec):
        docs.sort(key=lambda item: _sort_value(_get_path(item, field)), reverse=int(direction) < 0)
    return docs


def _seed_from_filter(query: dict) -> dict:
    doc = {}
    for key, value in (query or {}).items():
        if str(key).startswith("$"):
            continue
        if isinstance(value, dict) and any(str(k).startswith("$") for k in value):
            continue
        _set_path(doc, key, value)
    return doc


def _apply_update(doc: dict, update: dict, *, inserting: bool = False) -> dict:
    doc = dict(doc)
    if not any(str(k).startswith("$") for k in (update or {})):
        replacement = dict(update or {})
        replacement.setdefault("_id", doc.get("_id"))
        return replacement

    if inserting:
        for path, value in (update.get("$setOnInsert") or {}).items():
            _set_path(doc, path, value)

    for path, value in (update.get("$set") or {}).items():
        _set_path(doc, path, value)

    for path, amount in (update.get("$inc") or {}).items():
        current = _get_path(doc, path, 0) or 0
        _set_path(doc, path, current + amount)

    for path, value in (update.get("$push") or {}).items():
        current = _get_path(doc, path)
        if not isinstance(current, list):
            current = []
        else:
            current = list(current)
        if isinstance(value, dict) and "$each" in value:
            current.extend(value.get("$each") or [])
        else:
            current.append(value)
        _set_path(doc, path, current)

    for path, value in (update.get("$pull") or {}).items():
        current = _get_path(doc, path)
        if isinstance(current, list):
            _set_path(doc, path, [item for item in current if not _match_condition(item, value)])

    for path in (update.get("$unset") or {}).keys():
        _unset_path(doc, path)

    return doc


@dataclass
class InsertOneResult:
    inserted_id: Any


@dataclass
class UpdateResult:
    matched_count: int
    modified_count: int


@dataclass
class DeleteResult:
    deleted_count: int


class SqlCursor:
    def __init__(self, collection, query=None, projection=None):
        self.collection = collection
        self.query = query or {}
        self.projection = projection
        self.sort_spec = []
        self.skip_count = 0
        self.limit_count = None

    def sort(self, key_or_list, direction=None):
        if direction is not None:
            self.sort_spec = [(key_or_list, direction)]
        elif isinstance(key_or_list, list):
            self.sort_spec = key_or_list
        elif isinstance(key_or_list, tuple):
            self.sort_spec = [key_or_list]
        else:
            self.sort_spec = [(key_or_list, 1)]
        return self

    def skip(self, count: int):
        self.skip_count = max(0, int(count or 0))
        return self

    def limit(self, count: int):
        self.limit_count = max(0, int(count or 0))
        return self

    async def to_list(self, length: Optional[int] = None):
        docs = await self.collection._find_docs(self.query)
        docs = _apply_sort(docs, self.sort_spec)
        if self.skip_count:
            docs = docs[self.skip_count:]
        limit = self.limit_count
        if length is not None:
            limit = min(limit, length) if limit is not None else length
        if limit is not None:
            docs = docs[:limit]
        return [_project(doc, self.projection) for doc in docs]


class SqlAggregateCursor:
    def __init__(self, collection, pipeline):
        self.collection = collection
        self.pipeline = pipeline or []

    async def to_list(self, length: Optional[int] = None):
        docs = await self.collection._find_docs({})
        current: list[dict] = docs
        for stage in self.pipeline:
            if "$match" in stage:
                current = [doc for doc in current if _matches(doc, stage["$match"])]
            elif "$group" in stage:
                group = stage["$group"]
                key_expr = group.get("_id")
                if not isinstance(key_expr, str) or not key_expr.startswith("$"):
                    raise NotImplementedError("SQL compatibility layer supports field-based $group only")
                field = key_expr[1:]
                counts = {}
                for doc in current:
                    key = _get_path(doc, field)
                    counts[key] = counts.get(key, 0) + 1
                current = [{"_id": key, "count": count} for key, count in counts.items()]
            elif "$sort" in stage:
                current = _apply_sort(current, list(stage["$sort"].items()))
            else:
                raise NotImplementedError(f"Aggregation stage not supported by SQL compatibility layer: {list(stage)}")
        if length is not None:
            current = current[:length]
        return current


class SqlServerCollection:
    def __init__(self, database, name: str):
        self.database = database
        self.name = _safe_identifier(name, "collection")
        self.unique_field: Optional[str] = None
        self.ttl_fields: set[str] = set()
        self._table_ready = False

    @property
    def table(self) -> str:
        return f"[{self.database.schema}].[{self.database.prefix}{self.name}]"

    def _connect(self):
        return self.database.client._connect()

    def _ensure_table_sync(self, conn) -> None:
        if self._table_ready:
            return
        cursor = conn.cursor()
        schema = self.database.schema
        table_name = self.database.prefix + self.name
        cursor.execute(
            f"""
            IF NOT EXISTS (SELECT 1 FROM sys.schemas WHERE name = %s)
                EXEC('CREATE SCHEMA [{schema}]');

            IF OBJECT_ID(N'[{schema}].[{table_name}]', N'U') IS NULL
            BEGIN
                CREATE TABLE [{schema}].[{table_name}] (
                    [id] NVARCHAR(64) NOT NULL PRIMARY KEY,
                    [doc] NVARCHAR(MAX) NOT NULL,
                    [unique_key] NVARCHAR(450) NULL,
                    [updated_at] DATETIME2(3) NOT NULL CONSTRAINT [DF_{table_name}_updated_at] DEFAULT SYSUTCDATETIME(),
                    CONSTRAINT [CK_{table_name}_json] CHECK (ISJSON([doc]) = 1)
                );
            END
            """,
            (schema,),
        )
        conn.commit()
        self._table_ready = True

    def _cleanup_expired_sync(self, conn) -> None:
        if not self.ttl_fields:
            return
        self._ensure_table_sync(conn)
        cursor = conn.cursor(as_dict=True)
        cursor.execute(f"SELECT [id], [doc] FROM {self.table}")
        now = datetime.now(timezone.utc)
        expired_ids = []
        for row in cursor.fetchall():
            try:
                doc = _deserialize_doc(row["doc"])
            except Exception:
                continue
            for field in self.ttl_fields:
                raw = _get_path(doc, field)
                if raw is None:
                    continue
                try:
                    if isinstance(raw, datetime):
                        dt = raw
                    else:
                        dt = datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
                    if dt.tzinfo is None:
                        dt = dt.replace(tzinfo=timezone.utc)
                    if dt <= now:
                        expired_ids.append(str(doc.get("_id")))
                        break
                except Exception:
                    continue
        if expired_ids:
            cursor = conn.cursor()
            for item_id in expired_ids:
                cursor.execute(f"DELETE FROM {self.table} WHERE [id] = %s", (item_id,))
            conn.commit()

    def _load_all_sync(self, conn, *, lock: bool = False) -> list[dict]:
        self._ensure_table_sync(conn)
        self._cleanup_expired_sync(conn)
        cursor = conn.cursor(as_dict=True)
        hint = " WITH (UPDLOCK, HOLDLOCK)" if lock else ""
        cursor.execute(f"SELECT [doc] FROM {self.table}{hint}")
        return [_deserialize_doc(row["doc"]) for row in cursor.fetchall()]

    def _unique_key_for(self, doc: dict):
        if not self.unique_field:
            return None
        value = _get_path(doc, self.unique_field)
        if value is None:
            return None
        return str(_normalize_scalar(value))

    def _write_doc_sync(self, conn, doc: dict, *, insert: bool = False) -> None:
        self._ensure_table_sync(conn)
        doc = dict(doc)
        if not doc.get("_id"):
            doc["_id"] = ObjectId()
        item_id = str(doc["_id"])
        raw = _serialize_doc(doc)
        unique_key = self._unique_key_for(doc)
        cursor = conn.cursor()
        if insert:
            cursor.execute(
                f"INSERT INTO {self.table} ([id], [doc], [unique_key]) VALUES (%s, %s, %s)",
                (item_id, raw, unique_key),
            )
        else:
            cursor.execute(
                f"UPDATE {self.table} SET [doc] = %s, [unique_key] = %s, [updated_at] = SYSUTCDATETIME() WHERE [id] = %s",
                (raw, unique_key, item_id),
            )

    async def _find_docs(self, query=None) -> list[dict]:
        def work():
            conn = self._connect()
            try:
                docs = self._load_all_sync(conn)
                return [doc for doc in docs if _matches(doc, query or {})]
            finally:
                conn.close()
        return await asyncio.to_thread(work)

    async def insert_one(self, doc: dict):
        def work():
            conn = self._connect()
            try:
                self._ensure_table_sync(conn)
                item = dict(doc)
                item.setdefault("_id", ObjectId())
                self._write_doc_sync(conn, item, insert=True)
                conn.commit()
                return InsertOneResult(item["_id"])
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()
        return await asyncio.to_thread(work)

    async def find_one(self, query=None, projection=None, sort=None):
        docs = await self._find_docs(query or {})
        docs = _apply_sort(docs, sort)
        if not docs:
            return None
        return _project(docs[0], projection)

    def find(self, query=None, projection=None):
        return SqlCursor(self, query or {}, projection)

    async def count_documents(self, query=None):
        docs = await self._find_docs(query or {})
        return len(docs)

    def aggregate(self, pipeline):
        return SqlAggregateCursor(self, pipeline)

    async def update_one(self, query: dict, update: dict, upsert: bool = False):
        result, _ = await self._update_one_internal(query, update, upsert=upsert, return_after=False)
        return result

    async def _update_one_internal(self, query: dict, update: dict, *, upsert: bool, return_after: bool):
        def work():
            conn = self._connect()
            try:
                self._ensure_table_sync(conn)
                conn.cursor().execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
                docs = self._load_all_sync(conn, lock=True)
                target = next((doc for doc in docs if _matches(doc, query or {})), None)
                if target is None:
                    if not upsert:
                        conn.rollback()
                        return UpdateResult(0, 0), None
                    target = _seed_from_filter(query or {})
                    target.setdefault("_id", ObjectId())
                    updated = _apply_update(target, update, inserting=True)
                    self._write_doc_sync(conn, updated, insert=True)
                    conn.commit()
                    return UpdateResult(0, 1), updated if return_after else None

                updated = _apply_update(target, update, inserting=False)
                updated["_id"] = target["_id"]
                modified = int(_serialize_doc(updated) != _serialize_doc(target))
                if modified:
                    self._write_doc_sync(conn, updated, insert=False)
                conn.commit()
                return UpdateResult(1, modified), updated if return_after else target
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

        return await asyncio.to_thread(work)

    async def update_many(self, query: dict, update: dict):
        def work():
            conn = self._connect()
            try:
                self._ensure_table_sync(conn)
                conn.cursor().execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
                docs = self._load_all_sync(conn, lock=True)
                matched = modified = 0
                for target in docs:
                    if not _matches(target, query or {}):
                        continue
                    matched += 1
                    updated = _apply_update(target, update)
                    updated["_id"] = target["_id"]
                    if _serialize_doc(updated) != _serialize_doc(target):
                        self._write_doc_sync(conn, updated, insert=False)
                        modified += 1
                conn.commit()
                return UpdateResult(matched, modified)
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

        return await asyncio.to_thread(work)

    async def find_one_and_update(self, query: dict, update: dict, upsert: bool = False, return_document=False):
        _, doc = await self._update_one_internal(
            query,
            update,
            upsert=upsert,
            return_after=bool(return_document),
        )
        return doc

    async def delete_one(self, query: dict):
        def work():
            conn = self._connect()
            try:
                docs = self._load_all_sync(conn, lock=True)
                target = next((doc for doc in docs if _matches(doc, query or {})), None)
                if not target:
                    conn.rollback()
                    return DeleteResult(0)
                cursor = conn.cursor()
                cursor.execute(f"DELETE FROM {self.table} WHERE [id] = %s", (str(target["_id"]),))
                conn.commit()
                return DeleteResult(1)
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()
        return await asyncio.to_thread(work)

    async def delete_many(self, query: dict):
        def work():
            conn = self._connect()
            try:
                docs = self._load_all_sync(conn, lock=True)
                ids = [str(doc["_id"]) for doc in docs if _matches(doc, query or {})]
                cursor = conn.cursor()
                for item_id in ids:
                    cursor.execute(f"DELETE FROM {self.table} WHERE [id] = %s", (item_id,))
                conn.commit()
                return DeleteResult(len(ids))
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()
        return await asyncio.to_thread(work)

    async def create_index(self, keys, unique: bool = False, expireAfterSeconds=None, **kwargs):
        if isinstance(keys, str):
            fields = [keys]
        else:
            fields = [item[0] if isinstance(item, (list, tuple)) else str(item) for item in keys]

        if expireAfterSeconds is not None:
            self.ttl_fields.update(fields)

        if unique and len(fields) == 1:
            self.unique_field = fields[0]

        def work():
            conn = self._connect()
            try:
                self._ensure_table_sync(conn)
                if self.unique_field:
                    docs = self._load_all_sync(conn)
                    cursor = conn.cursor()
                    for doc in docs:
                        cursor.execute(
                            f"UPDATE {self.table} SET [unique_key] = %s WHERE [id] = %s",
                            (self._unique_key_for(doc), str(doc["_id"])),
                        )
                    index_name = _safe_identifier(
                        f"UX_{self.database.prefix}{self.name}_unique_key",
                        "UX_collection_unique_key",
                    )[:120]
                    cursor.execute(
                        f"""
                        IF NOT EXISTS (
                            SELECT 1 FROM sys.indexes
                            WHERE name = %s AND object_id = OBJECT_ID(N'{self.table}')
                        )
                        CREATE UNIQUE INDEX [{index_name}] ON {self.table} ([unique_key])
                        WHERE [unique_key] IS NOT NULL
                        """,
                        (index_name,),
                    )
                conn.commit()
            except Exception:
                conn.rollback()
                raise
            finally:
                conn.close()

        await asyncio.to_thread(work)
        return f"{self.name}_{'_'.join(fields)}"


class SqlServerDatabase:
    def __init__(self, client):
        self.client = client
        self.schema = client.schema
        self.prefix = client.prefix
        self._collections = {}

    def __getattr__(self, name: str):
        if name.startswith("_"):
            raise AttributeError(name)
        if name not in self._collections:
            self._collections[name] = SqlServerCollection(self, name)
        return self._collections[name]

    def __getitem__(self, name: str):
        return getattr(self, name)


class SqlServerAdmin:
    def __init__(self, client):
        self.client = client

    async def command(self, name: str):
        if str(name).lower() != "ping":
            raise NotImplementedError(name)

        def work():
            conn = self.client._connect()
            try:
                cursor = conn.cursor(as_dict=True)
                cursor.execute(
                    "SELECT CAST(SERVERPROPERTY('ProductVersion') AS NVARCHAR(128)) AS version, "
                    "CAST(SERVERPROPERTY('ProductMajorVersion') AS INT) AS major_version"
                )
                row = cursor.fetchone() or {}
                self.client.server_version = row.get("version")
                self.client.server_major_version = row.get("major_version")
                if self.client.server_major_version and int(self.client.server_major_version) < 15:
                    raise RuntimeError(
                        f"SQL Server 2019 ou superior requerido; major version encontrada: {self.client.server_major_version}"
                    )
                for collection in COLLECTION_NAMES:
                    coll = getattr(self.client.database, collection)
                    coll._ensure_table_sync(conn)
                return {"ok": 1, "version": self.client.server_version}
            finally:
                conn.close()

        return await asyncio.to_thread(work)


class SqlServerClient:
    def __init__(self):
        try:
            import pymssql
        except ImportError as exc:
            raise RuntimeError(
                "DB_ENGINE=sqlserver exige o pacote pymssql. Instale as dependências do backend."
            ) from exc

        self.pymssql = pymssql
        self.server = (os.environ.get("SQLSERVER_SERVER") or os.environ.get("SQLSERVER_HOST") or "").strip()
        self.port = int(os.environ.get("SQLSERVER_PORT") or "1433")
        self.database_name = (os.environ.get("SQLSERVER_DATABASE") or os.environ.get("DB_NAME") or "gestao_materiais").strip()
        self.user = (os.environ.get("SQLSERVER_USER") or os.environ.get("SQLSERVER_USERNAME") or "").strip()
        self.password = os.environ.get("SQLSERVER_PASSWORD") or ""
        self.schema = _safe_identifier(os.environ.get("SQLSERVER_SCHEMA") or "dbo", "dbo")
        self.prefix = _safe_identifier(os.environ.get("SQLSERVER_TABLE_PREFIX") or "gm_", "gm_")
        self.login_timeout = int(os.environ.get("SQLSERVER_LOGIN_TIMEOUT") or "10")
        self.query_timeout = int(os.environ.get("SQLSERVER_QUERY_TIMEOUT") or "30")
        self.server_version = None
        self.server_major_version = None

        if not self.server:
            raise RuntimeError("SQLSERVER_SERVER é obrigatório quando DB_ENGINE=sqlserver")
        if not self.user:
            raise RuntimeError("SQLSERVER_USER é obrigatório quando DB_ENGINE=sqlserver")
        if not self.password:
            raise RuntimeError("SQLSERVER_PASSWORD é obrigatório quando DB_ENGINE=sqlserver")
        if not self.database_name:
            raise RuntimeError("SQLSERVER_DATABASE é obrigatório quando DB_ENGINE=sqlserver")

        self.database = SqlServerDatabase(self)
        self.admin = SqlServerAdmin(self)

    def _connect(self):
        return self.pymssql.connect(
            server=self.server,
            user=self.user,
            password=self.password,
            database=self.database_name,
            port=self.port,
            login_timeout=self.login_timeout,
            timeout=self.query_timeout,
            charset="UTF-8",
            autocommit=False,
        )

    def close(self):
        # Connections are short-lived and closed per operation.
        return None


def create_database():
    engine = (os.environ.get("DB_ENGINE") or "mongodb").strip().lower()
    if engine in {"sqlserver", "mssql", "sql_server", "sql"}:
        client = SqlServerClient()
        return client, client.database, client.database_name, "sqlserver"

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "gestao_materiais")
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
    return client, client[db_name], db_name, "mongodb"
