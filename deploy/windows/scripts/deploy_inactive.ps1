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

# Ensure certs directory exists — cert.pem and key.pem must be placed here manually
if (-not (Test-Path "certs")) {
  New-Item -ItemType Directory -Path "certs" | Out-Null
  Write-Warning "certs\ directory created but cert.pem / key.pem are missing. nginx will fail to start until they are present."
}
if (-not (Test-Path "certs\cert.pem") -or -not (Test-Path "certs\key.pem")) {
  Write-Warning "TLS certificates not found in certs\. Run the openssl command to generate them."
}

$envLines = Get-Content ".env"

$activeSlotLine = $envLines | Where-Object { $_ -match '^ACTIVE_SLOT=' } | Select-Object -First 1
$activeSlot = if ($activeSlotLine) { ($activeSlotLine -split '=', 2)[1].Trim() } else { "blue" }
$targetSlot = if ($activeSlot -eq "blue") { "green" } else { "blue" }

$slotTagKey = if ($targetSlot -eq "blue") { "BLUE_IMAGE_TAG" } else { "GREEN_IMAGE_TAG" }

# Migrate from shared IMAGE_TAG to per-slot tags if needed
$hasBlueLine  = $envLines | Where-Object { $_ -match '^BLUE_IMAGE_TAG=' }
$hasGreenLine = $envLines | Where-Object { $_ -match '^GREEN_IMAGE_TAG=' }
if (-not $hasBlueLine -or -not $hasGreenLine) {
  $fallbackLine = $envLines | Where-Object { $_ -match '^IMAGE_TAG=' } | Select-Object -First 1
  $fallback = if ($fallbackLine) { ($fallbackLine -split '=', 2)[1].Trim() } else { "latest" }
  if (-not $hasBlueLine)  { $envLines += "BLUE_IMAGE_TAG=$fallback" }
  if (-not $hasGreenLine) { $envLines += "GREEN_IMAGE_TAG=$fallback" }
}

$envPath = Join-Path $RootDir ".env"
$updated = $envLines | ForEach-Object {
  if ($_ -match '^INACTIVE_SLOT=') { "INACTIVE_SLOT=$targetSlot" }
  elseif ($_ -match "^${slotTagKey}=") { "${slotTagKey}=$ImageTag" }
  else { $_ }
}
if (-not ($updated | Where-Object { $_ -match '^INACTIVE_SLOT=' })) {
  $updated += "INACTIVE_SLOT=$targetSlot"
}
if (-not ($updated | Where-Object { $_ -match "^${slotTagKey}=" })) {
  $updated += "${slotTagKey}=$ImageTag"
}
Set-Content -Path $envPath -Value $updated

docker compose -f docker-compose.yml pull "api-$targetSlot" "frontend-$targetSlot"
docker compose -f docker-compose.yml up -d --force-recreate db "api-$targetSlot" "frontend-$targetSlot"
docker compose -f docker-compose.yml up -d --force-recreate --no-deps proxy

Write-Output "deployed_slot=$targetSlot"
Write-Output "image_tag=$ImageTag"
