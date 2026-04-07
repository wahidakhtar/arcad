param(
  [string]$RootDir = "C:\arcad-bluegreen",
  [Parameter(Mandatory = $true)]
  [ValidateSet("blue", "green")]
  [string]$TargetSlot
)

$ErrorActionPreference = "Stop"

Set-Location $RootDir

if (-not (Test-Path ".env")) {
  Write-Error ".env is missing in $RootDir"
}

$envPath = Join-Path $RootDir ".env"
$envContent = Get-Content $envPath

$inactiveSlot = if ($TargetSlot -eq "blue") { "green" } else { "blue" }

# Read credentials and DB names to reconstruct correct URLs deterministically.
# Active slot always gets the production DB (db), inactive always gets test (db-test).
function Get-EnvVal($lines, $key) {
  $line = $lines | Where-Object { $_ -match "^${key}=" } | Select-Object -First 1
  if ($line) { return ($line -split '=', 2)[1].Trim() }
  return ""
}

$pgUser   = Get-EnvVal $envContent "POSTGRES_USER"
$pgPass   = Get-EnvVal $envContent "POSTGRES_PASSWORD"
$pgDb     = Get-EnvVal $envContent "POSTGRES_DB"
$pgTestDb = Get-EnvVal $envContent "TEST_POSTGRES_DB"

$prodUrl = "postgresql://${pgUser}:${pgPass}@db:5432/${pgDb}"
$testUrl = "postgresql://${pgUser}:${pgPass}@db-test:5432/${pgTestDb}"

$activeDbKey   = if ($TargetSlot -eq "blue") { "BLUE_DATABASE_URL" }  else { "GREEN_DATABASE_URL" }
$inactiveDbKey = if ($TargetSlot -eq "blue") { "GREEN_DATABASE_URL" } else { "BLUE_DATABASE_URL" }

$updated = $envContent | ForEach-Object {
  if ($_ -match '^ACTIVE_SLOT=')        { "ACTIVE_SLOT=$TargetSlot" }
  elseif ($_ -match '^INACTIVE_SLOT=')  { "INACTIVE_SLOT=$inactiveSlot" }
  elseif ($_ -match "^${activeDbKey}=") { "${activeDbKey}=$prodUrl" }
  elseif ($_ -match "^${inactiveDbKey}=") { "${inactiveDbKey}=$testUrl" }
  else { $_ }
}
if (-not ($updated | Where-Object { $_ -match '^ACTIVE_SLOT=' }))   { $updated += "ACTIVE_SLOT=$TargetSlot" }
if (-not ($updated | Where-Object { $_ -match '^INACTIVE_SLOT=' })) { $updated += "INACTIVE_SLOT=$inactiveSlot" }

Set-Content -Path $envPath -Value $updated

# Recreate API containers so they connect to the correct DBs, then reload proxy
docker compose -f docker-compose.yml up -d --force-recreate "api-blue" "api-green"
docker compose -f docker-compose.yml up -d --force-recreate --no-deps proxy

Write-Output "active_slot=$TargetSlot"
Write-Output "prod_db_slot=$TargetSlot"
