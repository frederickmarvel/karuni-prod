# Karuni

Karuni is an OpenAI-compatible AI gateway with customer workspaces, prepaid usage accounting, referral-to-wallet credits, and a PostgreSQL-backed admin console.

For a complete Docker, PostgreSQL, 9Router, Google Auth, HTTPS, backup, and operations walkthrough, see [DEPLOYMENT.md](./DEPLOYMENT.md).

Coding agents should also follow [AGENTS.md](./AGENTS.md), which defines the safe, machine-readable deployment sequence and required user-provided secrets.

Quick local start:

```bash
cp .env.example .env
# Edit .env and replace every required placeholder.
docker compose up -d --build
docker compose ps
```

Open `http://127.0.0.1:18786` after both services are healthy.
