"""Utilitário interativo. Não recebe senha SQL por argumento de linha de comando."""
from __future__ import annotations

import argparse
import getpass
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from credential_crypto import encrypt_secret, generate_master_key_text


def main():
    parser = argparse.ArgumentParser(description="Gera tokens ENCv1 para credenciais SQL.")
    parser.add_argument("--generate-key", action="store_true")
    parser.add_argument("--dbmail", action="store_true")
    args = parser.parse_args()

    if args.generate_key:
        print(generate_master_key_text())
        return

    prefix = "SQLSERVER_DBMAIL" if args.dbmail else "SQLSERVER"
    user = getpass.getpass("Usuário SQL (entrada oculta): ")
    password = getpass.getpass("Senha SQL (entrada oculta): ")
    if not user or not password:
        raise SystemExit("Usuário e senha são obrigatórios")

    print(f"{prefix}_USER_ENCRYPTED={encrypt_secret(user, prefix + '_USER')}")
    print(f"{prefix}_PASSWORD_ENCRYPTED={encrypt_secret(password, prefix + '_PASSWORD')}")


if __name__ == "__main__":
    main()
