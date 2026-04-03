param(
  [string]$RootDir = "C:\arcad-bluegreen",
  [Parameter(Mandatory = $true)]
  [string]$ImageTag
)

$ErrorActionPreference = "Stop"

Set-Location $RootDir

if (-not (Test-Path ".env")) {
  Write-Error ".env is missing in $RootDir"
}

$envLines = Get-Content ".env"
$activeSlotLine = $envLines | Where-Object { $_ -match '^ACTIVE_SLOT=' } | Select-Object -First 1
$activeSlot = if ($activeSlotLine) { ($activeSlotLine -split '=', 2)[1].Trim() } else { "blue" }
$targetSlot = if ($activeSlot -eq "blue") { "green" } else { "blue" }

$env:IMAGE_TAG = $ImageTag

# Keep INACTIVE_SLOT in .env in sync so the proxy test port routes correctly
$envPath = Join-Path $RootDir ".env"
$envContent = Get-Content $envPath
if ($envContent | Where-Object { $_ -match '^INACTIVE_SLOT=' }) {
  $updated = $envContent | ForEach-Object {
    if ($_ -match '^INACTIVE_SLOT=') { "INACTIVE_SLOT=$targetSlot" } else { $_ }
  }
  Set-Content -Path $envPath -Value $updated
} else {
  Add-Content -Path $envPath -Value "`nINACTIVE_SLOT=$targetSlot"
}

docker compose -f docker-compose.yml pull "api-$targetSlot" "frontend-$targetSlot"
docker compose -f docker-compose.yml up -d db "api-$targetSlot" "frontend-$targetSlot"

Write-Output "deployed_slot=$targetSlot"
Write-Output "image_tag=$ImageTag"
