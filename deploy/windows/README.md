# Blue/Green Deployment on Windows

This setup mirrors the Linux blue/green deployment with the same two app slots:

- `blue`
- `green`

`proxy` serves traffic only to the slot named by `ACTIVE_SLOT` in `deploy/windows/.env`.

## Server layout

Recommended path:

```powershell
C:\arcad-bluegreen
```

Copy these repo paths to that directory:

- `deploy/windows/docker-compose.yml`
- `deploy/windows/frontend.Dockerfile`
- `deploy/windows/proxy/default.conf.template`
- `deploy/windows/scripts/deploy_inactive.ps1`
- `deploy/windows/scripts/promote_slot.ps1`
- `deploy/windows/.env.example` as `.env`

## Required server software

- Docker Desktop or Docker Engine on Windows
- Docker Compose support (`docker compose`)
- Linux containers enabled
- access to pull images from GHCR

If you want to use the GitHub Actions workflows in this repo, the server also needs:

- OpenSSH Server
- PowerShell

## Runtime env

Set these values in `.env`:

- `ACTIVE_SLOT`
- `API_IMAGE`
- `FRONTEND_IMAGE`
- `IMAGE_TAG`
- `DATABASE_URL`
- `SECRET_KEY`
- `API_PREFIX`
- `CORS_ALLOWED_ORIGINS`

## First boot

```powershell
Copy-Item .env.example .env
docker compose -f docker-compose.yml up -d
```

## Automatic inactive-slot deploy from git push

The paired GitHub workflow builds images on every push to `main` and runs:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\deploy_inactive.ps1 C:\arcad-bluegreen <git-sha>
```

That updates the inactive slot only.

## Promote with one click

Use the `Promote Blue Green Slot (Windows)` workflow in GitHub Actions and choose:

- `blue`
- `green`

That workflow runs:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\promote_slot.ps1 C:\arcad-bluegreen <slot>
```

Traffic flips by recreating only the proxy container.

## Notes

- This path is intended for Windows hosts but still assumes Linux containers for the Docker workloads.
- If the client has WSL or a Linux host available, `deploy/bluegreen/` remains the cleaner primary path.
