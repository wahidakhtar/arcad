# Blue/Green Deployment

This setup keeps two app slots on the internal server:

- `blue`
- `green`

`proxy` serves traffic only to the slot named by `ACTIVE_SLOT` in `deploy/bluegreen/.env`.

## Server layout

Recommended path:

```bash
/opt/arcad-bluegreen
```

Copy these repo paths to that directory:

- `deploy/bluegreen/docker-compose.yml`
- `deploy/bluegreen/proxy/default.conf.template`
- `deploy/bluegreen/scripts/deploy_inactive.sh`
- `deploy/bluegreen/scripts/promote_slot.sh`
- `deploy/bluegreen/.env.example` as `.env`

## Required server software

- Docker Engine
- Docker Compose plugin
- access to pull images from GHCR

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

```bash
cp .env.example .env
docker compose -f docker-compose.yml up -d
```

## Automatic green deploy from git push

The GitHub workflow builds images on every push to `main` and runs:

```bash
./scripts/deploy_inactive.sh /opt/arcad-bluegreen <git-sha>
```

That updates the inactive slot only.

## Promote with one click

Use the `Promote Blue Green Slot` workflow in GitHub Actions and choose:

- `blue`
- `green`

That workflow runs:

```bash
./scripts/promote_slot.sh /opt/arcad-bluegreen <slot>
```

Traffic flips by recreating only the proxy container.
