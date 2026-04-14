param(
  [switch]$IncludeAll
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if (-not $env:SUPABASE_DB_PASSWORD) {
  Write-Error "SUPABASE_DB_PASSWORD não configurada. Defina a senha do Postgres remoto antes de continuar."
}

$baseArgs = @("supabase", "db", "push", "--linked", "--password", $env:SUPABASE_DB_PASSWORD)

if ($IncludeAll) {
  $baseArgs += "--include-all"
}

Write-Host "Aplicando migrations remotas..."
& npx @baseArgs

if ($LASTEXITCODE -ne 0) {
  Write-Error "Falha ao aplicar migrations remotas."
}

Write-Host ""
Write-Host "Estado final das migrations:"
& npx supabase migration list

if ($LASTEXITCODE -ne 0) {
  Write-Error "Falha ao consultar a lista final de migrations."
}
