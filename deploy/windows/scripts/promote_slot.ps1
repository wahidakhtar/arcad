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

if ($envContent | Where-Object { $_ -match '^ACTIVE_SLOT=' }) {
  $updated = $envContent | ForEach-Object {
    if ($_ -match '^ACTIVE_SLOT=') { "ACTIVE_SLOT=$TargetSlot" } else { $_ }
  }
  Set-Content -Path $envPath -Value $updated
} else {
  Add-Content -Path $envPath -Value "`nACTIVE_SLOT=$TargetSlot"
}

docker compose -f docker-compose.yml up -d proxy

Write-Output "active_slot=$TargetSlot"
