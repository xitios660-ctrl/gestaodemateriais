$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

$Python = if ($env:PYTHON_BIN) { $env:PYTHON_BIN } else { "python" }
$Venv = ".venv-sqlserver"

& $Python -m venv $Venv
& ".\$Venv\Scripts\pip.exe" install -r requirements.txt
& ".\$Venv\Scripts\python.exe" ".\tools\check_server_compatibility.py"

Write-Host ""
Write-Host "Ambiente SQL Server criado em backend\$Venv"
Write-Host "Nenhuma atualização do Windows/SQL Server foi executada."
Write-Host "Use sql\sqlserver2012_schema.sql para criar a estrutura do banco."
Write-Host "Use tools\create_credential_master_key.ps1 para criar a chave protegida por ACL."
