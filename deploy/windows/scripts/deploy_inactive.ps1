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

docker compose -f docker-compose.yml pull "api-$targetSlot" "frontend-$targetSlot"
docker compose -f docker-compose.yml up -d "api-$targetSlot" "frontend-$targetSlot"

Write-Output "deployed_slot=$targetSlot"
Write-Output "image_tag=$ImageTag"
