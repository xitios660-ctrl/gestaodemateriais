import asyncio
import os
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

from database import COLLECTION_NAMES, SqlServerClient


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")


async def create_sql_indexes(db):
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.login_attempts.create_index("expires_at", expireAfterSeconds=0)
    await db.rate_limits.create_index("expires_at", expireAfterSeconds=0)
    await db.tickets.create_index("ticket_number", unique=True)
    await db.tickets.create_index([("category_id", 1), ("created_at", -1)])
    await db.tickets.create_index([("status", 1), ("created_at", -1)])
    await db.tickets.create_index("requester.email")
    await db.tickets.create_index("requester.matricula")
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.password_reset_tokens.create_index("email")
    await db.password_reset_tokens.create_index("purge_at", expireAfterSeconds=0)
    await db.password_reset_requests.create_index("email")
    await db.password_reset_requests.create_index("expires_at", expireAfterSeconds=0)
    await db.audit_logs.create_index([("created_at", -1)])
    await db.audit_logs.create_index([("actor_id", 1), ("created_at", -1)])
    await db.email_events.create_index([("email", 1), ("received_at", -1)])
    await db.email_events.create_index([("message_id", 1), ("received_at", -1)])
    await db.users.create_index([("last_login_at", -1)])


async def main():
    mongo_url = (os.environ.get("MONGO_URL") or "").strip()
    mongo_db_name = (os.environ.get("DB_NAME") or "gestao_materiais").strip()
    clear_destination = (os.environ.get("MIGRATION_CLEAR_SQLSERVER") or "").strip().lower() in {
        "1", "true", "yes"
    }

    if not mongo_url:
        raise RuntimeError("MONGO_URL é obrigatório para executar a migração")

    mongo_client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
    sql_client = SqlServerClient()

    try:
        await mongo_client.admin.command("ping")
        sql_info = await sql_client.admin.command("ping")
        sql_db = sql_client.database

        print(
            f"MongoDB conectado: {mongo_db_name} | "
            f"SQL Server conectado: {sql_client.database_name} "
            f"(versão {sql_info.get('version', 'desconhecida')})"
        )

        for collection_name in COLLECTION_NAMES:
            source = mongo_client[mongo_db_name][collection_name]
            destination = getattr(sql_db, collection_name)

            if clear_destination:
                deleted = await destination.delete_many({})
                print(f"{collection_name}: destino limpo ({deleted.deleted_count} registros)")

            copied = 0
            cursor = source.find({})
            async for doc in cursor:
                await destination.update_one(
                    {"_id": doc["_id"]},
                    {"$set": doc},
                    upsert=True,
                )
                copied += 1
                if copied % 250 == 0:
                    print(f"{collection_name}: {copied} registros copiados...")

            source_count = await source.count_documents({})
            destination_count = await destination.count_documents({})
            print(
                f"{collection_name}: concluído | "
                f"Mongo={source_count} | SQL={destination_count} | processados={copied}"
            )

        await create_sql_indexes(sql_db)
        print("Índices SQL configurados.")
        print("Migração concluída. O MongoDB não foi alterado.")
        print("Para usar SQL Server na aplicação, defina DB_ENGINE=sqlserver e reinicie o serviço.")
    finally:
        mongo_client.close()
        sql_client.close()


if __name__ == "__main__":
    asyncio.run(main())
