import asyncio
import os
from datetime import datetime, timezone

from motor.motor_asyncio import AsyncIOMotorClient


async def main():
    email = (os.environ.get("ADMIN_MIGRATION_EMAIL") or "").strip().lower()
    password_hash = os.environ.get("ADMIN_MIGRATION_PASSWORD_HASH") or ""

    if not email and not password_hash:
        print("Admin migration skipped")
        return
    if not email or not password_hash:
        raise RuntimeError("ADMIN_MIGRATION_EMAIL and ADMIN_MIGRATION_PASSWORD_HASH must both be set")
    if not password_hash.startswith(("$2a$", "$2b$", "$2y$")):
        raise RuntimeError("Admin migration password hash is invalid")

    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DB_NAME", "gestao_materiais")
    client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
    db = client[db_name]

    try:
        await client.admin.command("ping")
        target = await db.users.find_one({"email": email})
        admin = target if target and target.get("role") == "admin" else await db.users.find_one({"role": "admin"})

        if target and target.get("role") != "admin":
            raise RuntimeError("Target e-mail belongs to a non-admin user")
        if target and admin and target["_id"] != admin["_id"]:
            raise RuntimeError("Target e-mail already belongs to another user")

        now = datetime.now(timezone.utc).isoformat()

        if admin:
            await db.users.update_one(
                {"_id": admin["_id"]},
                {
                    "$set": {
                        "email": email,
                        "password_hash": password_hash,
                        "role": "admin",
                        "updated_at": now,
                    },
                    "$inc": {"token_version": 1},
                },
            )
            print("Admin credentials migrated")
        else:
            await db.users.insert_one(
                {
                    "email": email,
                    "password_hash": password_hash,
                    "name": "Administrador",
                    "role": "admin",
                    "token_version": 0,
                    "created_at": now,
                }
            )
            print("Admin account created by migration")
    finally:
        client.close()


if __name__ == "__main__":
    asyncio.run(main())
