#!/usr/bin/env sh
set -eu

cd "$(dirname "$0")"
PYTHON_BIN="${PYTHON_BIN:-python3}"
VENV_DIR=".venv-sqlserver"

"$PYTHON_BIN" -m venv "$VENV_DIR"
"$VENV_DIR/bin/python" -m pip install --upgrade pip
"$VENV_DIR/bin/pip" install -r requirements.txt

echo ""
echo "Ambiente SQL Server criado em backend/$VENV_DIR"
echo "Ative com: source $VENV_DIR/bin/activate"
echo "Depois copie .env.sqlserver.example para .env e preencha as credenciais."
