# Karuni deployment contract for coding agents

Read [`DEPLOYMENT.md`](./DEPLOYMENT.md) completely before deploying this repository.

## Authority and secrets

- Do not deploy merely because this file exists. Deploy only when the user explicitly requests deployment to a named server or environment.
- Never invent, expose, log, or commit passwords, API keys, OAuth client IDs, private database URLs, or DNS credentials.
- Obtain the target hostname, server access, PostgreSQL password, master-admin credentials, and 9Router key from the user or an approved secret manager.
- Treat `.env` as secret. Do not quote its values in chat or command output.
- Do not run `docker compose down -v`, remove volumes, overwrite an existing `.env`, restore a database, or change DNS without explicit authorization and a verified target.

## Required deployment sequence

1. Confirm the target is the intended Karuni server and inspect existing containers, volumes, `.env`, and backups without modifying them.
2. Run `npm ci`, `npm run check`, and `npm test`.
3. If `.env` does not exist, copy `.env.example` and request the missing real values. Do not substitute placeholders.
4. Run `npm run deploy:check` and `docker compose config --quiet`.
5. For local/private HTTP deployment, run `docker compose up -d --build`.
6. For public production deployment, confirm DNS and ports 80/443, then run `docker compose -f compose.yaml -f compose.prod.yaml up -d --build`.
7. Wait for both `postgres` and `app` to report healthy. For production, also verify Caddy and HTTPS.
8. Verify `/health`, `/v1/models`, master-admin sign-in, and PostgreSQL persistence. Never make a paid inference request unless the user authorized it.
9. Report the exact deployment target, health status, image/container state, and any configuration still requiring the user. Never report secret values.

## Existing deployments

- Back up PostgreSQL before upgrades or schema-affecting work.
- PostgreSQL initialization scripts run only for a new empty volume. Do not expect `postgres/init.sql` to rerun on an existing volume.
- Use `docker compose up -d --build` for in-place application updates. Do not recreate the PostgreSQL volume.
- If deployment fails, preserve logs and the existing database. Prefer rolling the app image/configuration back over altering data.

## Administrative roles

- The account named by `KARUNI_ADMIN_EMAIL` is the `master` account. An existing account with role `admin` at that email is promoted to `master` on startup.
- Only `master` may create another administrator.
- Created administrators receive role `admin`; they cannot create more administrators or block administrator accounts.
- Do not create, delete, promote, or share administrator credentials without explicit user authorization.
