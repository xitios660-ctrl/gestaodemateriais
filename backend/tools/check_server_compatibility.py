"""Verificação somente leitura do ambiente corporativo."""
from __future__ import annotations

import platform
import re
import subprocess
import sys


def command_version(command):
    try:
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
        lines = (result.stdout or result.stderr or "").strip().splitlines()
        return lines[0] if lines else "não detectado"
    except Exception:
        return "não detectado"


def main():
    print("Sistema:", platform.platform())
    print("Python:", sys.version.split()[0])
    print("Node:", command_version(["node", "--version"]))
    print("npm:", command_version(["npm", "--version"]))
    print("Git:", command_version(["git", "--version"]))

    if sys.version_info < (3, 11):
        print("ERRO: Python 3.11+ é necessário.")
        return 2

    try:
        import pyodbc
        drivers = pyodbc.drivers()
    except Exception as exc:
        print("ERRO: pyodbc indisponível:", type(exc).__name__)
        return 2

    supported = [
        d for d in drivers
        if d in {
            "ODBC Driver 17 for SQL Server",
            "ODBC Driver 18 for SQL Server",
        }
    ]
    print("ODBC SQL Server detectados:", ", ".join(supported) or "nenhum")
    if not supported:
        print("ERRO: é necessário ODBC Driver 17 ou 18.")
        return 2

    node_text = command_version(["node", "--version"])
    match = re.search(r"(\d+)\.(\d+)\.(\d+)", node_text)
    if match and tuple(map(int, match.groups())) < (18, 20, 8):
        print("AVISO: frontend preparado para Node 18.20.8+.")

    print("Preflight concluído sem alterar nenhuma configuração do servidor.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
