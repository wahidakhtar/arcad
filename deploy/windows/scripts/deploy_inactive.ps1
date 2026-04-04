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

# Keep INACTIVE_SLOT and IMAGE_TAG in .env in sync
$envPath = Join-Path $RootDir ".env"
$envContent = Get-Content $envPath
$updated = $envContent | ForEach-Object {
  if ($_ -match '^INACTIVE_SLOT=') { "INACTIVE_SLOT=$targetSlot" }
  elseif ($_ -match '^IMAGE_TAG=') { "IMAGE_TAG=$ImageTag" }
  else { $_ }
}
if (-not ($updated | Where-Object { $_ -match '^INACTIVE_SLOT=' })) {
  $updated += "INACTIVE_SLOT=$targetSlot"
}
if (-not ($updated | Where-Object { $_ -match '^IMAGE_TAG=' })) {
  $updated += "IMAGE_TAG=$ImageTag"
}
Set-Content -Path $envPath -Value $updated

docker compose -f docker-compose.yml pull "api-$targetSlot" "frontend-$targetSlot"
docker compose -f docker-compose.yml up -d db "api-$targetSlot" "frontend-$targetSlot"
docker compose -f docker-compose.yml up -d --force-recreate proxy

Write-Output "deployed_slot=$targetSlot"
Write-Output "image_tag=$ImageTag"
