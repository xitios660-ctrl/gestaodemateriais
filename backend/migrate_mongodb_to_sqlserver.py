"""Safe MongoDB -> SQL Server 2019 migration helper.

Dry-run is the default. Nothing is written until --apply is passed.
The live application can stay on DB_ENGINE=mongodb while this script prepares/copies
an alternate SQL Server database.
"""
import argparse
import asyncio
import os
from copy import deepcopy

from motor.motor_asyncio import AsyncIOMotorClient

from database import COLLECTION_NAMES, SqlServerClient


async def migrate(apply: bool, replace: bool):
    mongo_url = (os.environ.get("MONGO_URL") or "").strip()
    mongo_db_name = (os.environ.get("DB_NAME") or "gestao_materiais").strip()
    if not mongo_url:
        raise RuntimeError("MONGO_URL é obrigatório para ler a base MongoDB de origem")

    mongo_client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=10000)
    sql_client = SqlServerClient()

    try:
        await mongo_client.admin.command("ping")
        sql_info = await sql_client.admin.command("ping")

        source = mongo_client[mongo_db_name]
        destination = sql_client.database

        print(f"Origem MongoDB: {mongo_db_name}")
        print(f"Destino SQL Server: {sql_client.database_name}")
        print(f"SQL Server: {sql_info.get('version', 'versão desconhecida')}")
        print("Modo:", "APLICAR" if apply else "SIMULAÇÃO")

        summary = []
        for name in COLLECTION_NAMES:
            mongo_collection = source[name]
            sql_collection = destination[name]
            source_count = await mongo_collection.count_documents({})
            destination_count = await sql_collection.count_documents({})
            summary.append((name, source_count, destination_count))
            print(
                f"- {name}: Mongo={source_count} | SQL Server={destination_count}"
            )

        if not apply:
            print("\nSimulação concluída. Nenhum dado foi alterado.")
            print("Use --apply para copiar. Use --replace somente para substituir dados já existentes no SQL Server.")
            return

        occupied = [(name, count) for name, _, count in summary if count]
        if occupied and not replace:
            joined = ", ".join(f"{name}={count}" for name, count in occupied)
            raise RuntimeError(
                "O SQL Server já possui dados. Migração cancelada por segurança: "
                + joined
                + ". Use --replace apenas se realmente quiser limpar o destino primeiro."
            )

        if replace:
            print("\nLimpando somente as tabelas equivalentes no SQL Server...")
            for name in COLLECTION_NAMES:
                await destination[name].delete_many({})

        copied_total = 0
        expected_counts = {}
        for name in COLLECTION_NAMES:
            docs = await source[name].find({}).to_list(length=None)
            expected_counts[name] = len(docs)
            copied = 0
            for doc in docs:
                await destination[name].insert_one(deepcopy(doc))
                copied += 1
            copied_total += copied
            print(f"Copiado {name}: {copied}")

        # Recria as restrições únicas que a aplicação também configura no startup.
        await destination.users.create_index("email", unique=True)
        await destination.tickets.create_index("ticket_number", unique=True)
        await destination.password_reset_tokens.create_index("token_hash", unique=True)

        mismatches = []
        for name, expected in expected_counts.items():
            actual = await destination[name].count_documents({})
            if actual != expected:
                mismatches.append(f"{name}: esperado={expected}, SQL={actual}")

        if mismatches:
            raise RuntimeError(
                "A verificação pós-migração encontrou divergências: " + "; ".join(mismatches)
            )

        print(f"\nMigração concluída e verificada: {copied_total} documento(s) copiado(s).")
        print("O MongoDB não foi alterado. Para usar SQL Server no app, mude DB_ENGINE=sqlserver.")
    finally:
        mongo_client.close()
        sql_client.close()


def main():
    parser = argparse.ArgumentParser(
        description="Copia as coleções do MongoDB para as tabelas compatíveis do SQL Server 2019+."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Executa a cópia. Sem esta opção, o script apenas mostra o plano.",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Limpa as tabelas de destino antes da cópia. Requer --apply.",
    )
    args = parser.parse_args()
    if args.replace and not args.apply:
        parser.error("--replace exige --apply")
    asyncio.run(migrate(apply=args.apply, replace=args.replace))


if __name__ == "__main__":
    main()
