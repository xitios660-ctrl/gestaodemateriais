#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR=".venv-sqlserver"

"$PYTHON_BIN" -m venv "$VENV_DIR"
"$VENV_DIR/bin/pip" install -r requirements.txt
"$VENV_DIR/bin/python" ./tools/check_server_compatibility.py

echo ""
echo "Ambiente SQL Server criado em backend/$VENV_DIR"
echo "Nenhuma atualização do sistema operacional/SQL Server foi executada."
echo "Use sql/sqlserver2012_schema.sql para criar a estrutura do banco."
