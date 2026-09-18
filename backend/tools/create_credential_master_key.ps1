param(
    [Parameter(Mandatory=$true)]
    [string]$ServiceAccount,
    [string]$OutputPath = (Join-Path $PSScriptRoot "..\credential-master.key")
)

$ErrorActionPreference = "Stop"

$bytes = New-Object byte[] 32
$rng = New-Object System.Security.Cryptography.RNGCryptoServiceProvider
try {
    $rng.GetBytes($bytes)
}
finally {
    $rng.Dispose()
}

$key = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
$parent = Split-Path -Parent $OutputPath
if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
}

[System.IO.File]::WriteAllText($OutputPath, $key, [System.Text.Encoding]::ASCII)

& icacls $OutputPath /inheritance:r | Out-Null
& icacls $OutputPath /grant:r "${ServiceAccount}:(R)" "NT AUTHORITY\SYSTEM:(F)" "BUILTIN\Administrators:(F)" | Out-Null

Write-Host ""
Write-Host "Chave mestra criada com ACL restrita em: $OutputPath"
Write-Host "Configure APP_CREDENTIAL_MASTER_KEY_FILE apontando para esse arquivo."
Write-Host "Não copie o conteúdo da chave para o Git."
