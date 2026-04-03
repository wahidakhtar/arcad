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

$updated = $envContent | ForEach-Object {
  if ($_ -match '^ACTIVE_SLOT=') { "ACTIVE_SLOT=$TargetSlot" }
  elseif ($_ -match '^INACTIVE_SLOT=') { "INACTIVE_SLOT=$inactiveSlot" }
  else { $_ }
}
if (-not ($updated | Where-Object { $_ -match '^ACTIVE_SLOT=' })) {
  $updated += "ACTIVE_SLOT=$TargetSlot"
}
if (-not ($updated | Where-Object { $_ -match '^INACTIVE_SLOT=' })) {
  $updated += "INACTIVE_SLOT=$inactiveSlot"
}
Set-Content -Path $envPath -Value $updated

docker compose -f docker-compose.yml up -d --force-recreate proxy

Write-Output "active_slot=$TargetSlot"
