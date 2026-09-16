$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$Python = if ($env:PYTHON_BIN) { $env:PYTHON_BIN } else { "python" }
$Venv = ".venv-sqlserver"

& $Python -m venv $Venv
& ".\$Venv\Scripts\python.exe" -m pip install --upgrade pip
& ".\$Venv\Scripts\pip.exe" install -r requirements.txt

Write-Host ""
Write-Host "Ambiente SQL Server criado em backend\$Venv"
Write-Host "Ative com: .\$Venv\Scripts\Activate.ps1"
Write-Host "Depois copie .env.sqlserver.example para .env e preencha as credenciais."
