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

# Read current slot-specific DB URLs before updating
$blueDbLine = $envContent | Where-Object { $_ -match '^BLUE_DATABASE_URL=' } | Select-Object -First 1
$greenDbLine = $envContent | Where-Object { $_ -match '^GREEN_DATABASE_URL=' } | Select-Object -First 1
$blueDb = if ($blueDbLine) { ($blueDbLine -split '=', 2)[1].Trim() } else { "" }
$greenDb = if ($greenDbLine) { ($greenDbLine -split '=', 2)[1].Trim() } else { "" }

# Swap DB URLs: newly active slot gets production DB, newly inactive gets test DB
$newBlueDb = if ($TargetSlot -eq "blue") { $blueDb } else { $greenDb }
$newGreenDb = if ($TargetSlot -eq "green") { $greenDb } else { $blueDb }

$updated = $envContent | ForEach-Object {
  if ($_ -match '^ACTIVE_SLOT=') { "ACTIVE_SLOT=$TargetSlot" }
  elseif ($_ -match '^INACTIVE_SLOT=') { "INACTIVE_SLOT=$inactiveSlot" }
  elseif ($_ -match '^BLUE_DATABASE_URL=') { "BLUE_DATABASE_URL=$newBlueDb" }
  elseif ($_ -match '^GREEN_DATABASE_URL=') { "GREEN_DATABASE_URL=$newGreenDb" }
  else { $_ }
}
if (-not ($updated | Where-Object { $_ -match '^ACTIVE_SLOT=' })) {
  $updated += "ACTIVE_SLOT=$TargetSlot"
}
if (-not ($updated | Where-Object { $_ -match '^INACTIVE_SLOT=' })) {
  $updated += "INACTIVE_SLOT=$inactiveSlot"
}
Set-Content -Path $envPath -Value $updated

# Recreate api containers so they connect to the swapped DBs, then reload proxy
docker compose -f docker-compose.yml up -d --force-recreate "api-blue" "api-green"
docker compose -f docker-compose.yml up -d --force-recreate proxy

Write-Output "active_slot=$TargetSlot"
