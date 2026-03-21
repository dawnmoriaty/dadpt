# Oracle Always Free Deployment (Backend + AI)

Muc tieu: chay full production stack tren 1 VPS Oracle Cloud Always Free.

## 1) Kien truc

- `api.your-domain.com` -> Nginx -> Go Backend (`backend:8080`)
- `ai.your-domain.com` -> Nginx -> AI Service (`aiservice:8100`)
- Internal services: Postgres, Redis, RabbitMQ, MinIO, Qdrant
- Frontend co the de tren Vercel
- DNS va SSL edge qua Cloudflare

## 2) Chuan bi VPS

```bash
sudo apt update && sudo apt install -y git curl
```

Clone repo vao server, vi du:

```bash
sudo mkdir -p /opt/dadpt
sudo chown -R $USER:$USER /opt/dadpt
cd /opt/dadpt
git clone <your-repo-url> .
```

## 3) Cai Docker

```bash
bash deploy/oracle/scripts/init-server.sh
newgrp docker
```

## 4) Tao env production

```bash
cd /opt/dadpt/deploy/oracle
cp .env.example .env
```

Cap nhat cac bien quan trong trong `.env`:

- `BACKEND_IMAGE`, `AISERVICE_IMAGE` (GHCR image)
- `DATABASE_PASSWORD`, `REDIS_PASSWORD`, `RABBITMQ_PASSWORD`, `MINIO_SECRET_KEY`
- `AUTH_SECRET`, `ENCRYPTION_KEY`
- `OPENAI_API_KEY` hoac `GOOGLE_API_KEY`

## 5) Cau hinh Nginx domain

Sua file:

- `deploy/oracle/nginx/conf.d/app.conf`

Thay:

- `api.example.com` -> domain API that ban
- `ai.example.com` -> domain AI that ban

## 6) Cloudflare SSL

1. Tao 2 DNS records (proxy on):
   - `api` -> VPS public IP
   - `ai` -> VPS public IP
2. SSL/TLS mode: `Full (strict)`
3. Tao Origin Certificate trong Cloudflare, luu vao:
   - `deploy/oracle/nginx/certs/origin.pem`
   - `deploy/oracle/nginx/certs/origin.key`

## 7) Chay stack

```bash
cd /opt/dadpt/deploy/oracle
docker compose -f docker-compose.prod.yml --env-file .env up -d
```

Check health:

```bash
docker compose -f docker-compose.prod.yml ps
curl -I https://api.your-domain.com/health
curl -I https://ai.your-domain.com/health
```

## 8) Seed AI tenant lan dau

```bash
cd /opt/dadpt
docker exec -it dadpt-aiservice python -m src.seed
```

## 9) CI/CD (GitHub Actions)

Da co workflow build/push image + deploy:

- `.github/workflows/deploy-oracle.yml`

Can set GitHub Secrets:

- `GHCR_USERNAME`
- `GHCR_TOKEN`
- `ORACLE_SSH_HOST`
- `ORACLE_SSH_USER`
- `ORACLE_SSH_KEY`
- `ORACLE_SSH_PORT` (optional, default 22)
- `ORACLE_TARGET_DIR` (optional, default `/opt/dadpt`)
- `API_DOMAIN`
- `AI_DOMAIN`

Neu merge `main`, workflow se:

1. Build/push image backend + aiservice len GHCR
2. SSH vao VPS
3. Pull image moi va `docker compose up -d`

## 10) Backup can ban

- Postgres volume: `postgres_data`
- AI sqlite volume: `aiservice_data`

Nen backup dinh ky 1 ngay/lan.
