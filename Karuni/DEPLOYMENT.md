# Karuni deployment and integration guide

This guide deploys Karuni with PostgreSQL, connects it to 9Router, optionally enables Google Sign-In, and puts the application behind automatic HTTPS. The included Compose stack is intended to make a clean deployment a two-command operation after secrets are configured.

## Architecture

```text
Browser / OpenAI client
          |
       HTTPS
          |
        Caddy                 optional locally, required for production
          |
      Karuni app
       /       \
PostgreSQL     9Router /v1
                   |
              AI providers
```

| Service | Requirement | Purpose |
| --- | --- | --- |
| Karuni app | Required | Web application, OpenAI-compatible API, authentication, billing, and admin console. |
| PostgreSQL | Required for this Docker deployment | Durable users, sessions, catalog, usage, referral, and admin data. |
| 9Router | Required for model sync and inference | OpenAI-compatible upstream model router. |
| Caddy or another TLS proxy | Required in production | HTTPS, certificate renewal, and secure Google/passkey cookies. |
| Google Identity Services | Optional | Google account registration and sign-in. Email/password remains available. |
| DNS | Required for public production | Points the production hostname to the Docker host. |

Redis, SMTP, object storage, and a payment processor are not currently required. Automated payment checkout is not integrated; account deposits are recorded by an administrator.

## 1. Prerequisites

- Docker Engine with the Docker Compose plugin.
- A 9Router API key.
- For production: a domain with ports `80` and `443` reaching the server.
- Optional: a Google OAuth 2.0 Web client ID.

9Router exposes an OpenAI-compatible `/v1` API. Its official generic integration guide documents `https://9router.com/v1` for the hosted service and `http://localhost:20128/v1` for a local installation: <https://9router.github.io/en/integration/other-tools/>.

## 2. Configure secrets

Create the active environment file:

```bash
cp .env.example .env
```

Generate URL-safe secrets. The PostgreSQL password must be URL-safe because Compose places it inside `KARUNI_POSTGRES_URL`.

```bash
openssl rand -base64 36 | tr '+/' '-_' | tr -d '='
openssl rand -base64 36 | tr '+/' '-_' | tr -d '='
```

Use one output for `POSTGRES_PASSWORD` and the other for `KARUNI_ADMIN_PASSWORD`. Then edit `.env` and set at least:

```dotenv
POSTGRES_PASSWORD=<random URL-safe database password>
KARUNI_ADMIN_EMAIL=admin@example.com
KARUNI_ADMIN_PASSWORD=<random password of at least 16 characters>
KARUNI_UPSTREAM_URL=https://9router.com/v1
KARUNI_UPSTREAM_KEY=<9Router dashboard API key>
```

Do not commit `.env`. It is excluded from Docker build context and should also be excluded from source control.

Validate the environment without printing its secrets:

```bash
npm run deploy:check
```

### Can another AI deploy from this guide?

Yes, if the agent can read the repository, run shell commands on the target server, access Docker, and has been explicitly authorized to deploy. The Markdown itself is documentation and does not execute automatically. An agent still needs real values for the domain, database password, master-admin credentials, 9Router key, and optional Google client ID.

[`AGENTS.md`](./AGENTS.md) provides a machine-readable deployment contract. It instructs compatible coding agents to validate the project, request missing secrets, preserve existing PostgreSQL volumes, launch the correct Compose stack, and verify health without exposing credentials. Before asking an agent to deploy, place the repository on the server and provide the necessary secrets through `.env` or an approved secret manager.

## 3. Start locally in seconds

```bash
docker compose up -d --build
docker compose ps
```

Compose waits for PostgreSQL to become healthy before starting Karuni. On the first start, the official PostgreSQL image executes [`postgres/init.sql`](./postgres/init.sql) automatically. PostgreSQL initialization scripts only run when the data directory is empty, which is the behavior documented by Docker: <https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/>.

Open:

- Customer application: <http://127.0.0.1:18786>
- Admin sign-in: <http://127.0.0.1:18786/admin/login>
- Health check: <http://127.0.0.1:18786/health>

Useful commands:

```bash
docker compose logs -f app
docker compose logs -f postgres
docker compose restart app
docker compose down
```

`docker compose down` retains the PostgreSQL volume. `docker compose down -v` permanently deletes the database volume and should only be used for an intentional clean reset.

## Master and administrator accounts

The account configured by `KARUNI_ADMIN_EMAIL` is the master administrator. On startup, an existing account at that email with the old `admin` role is promoted to `master`; its password is not reset.

The master can create another administrator from **Admin → Users & balances → Add administrator (master only)**. Creation requires:

- A unique email address.
- A temporary password of at least 16 characters.
- The current master password for reauthentication.
- An audit reason.

The new account receives the `admin` role and can use the admin console, model controls, customer controls, and its own passkeys. It cannot create further administrators or block another administrator. Give the temporary password to the intended administrator through a secure channel and have them change it immediately from **Security**.

## 4. Connect 9Router

### Hosted 9Router

Create an API key in the 9Router dashboard and set:

```dotenv
KARUNI_UPSTREAM_URL=https://9router.com/v1
KARUNI_UPSTREAM_KEY=<your key>
KARUNI_ALLOW_INSECURE_UPSTREAM=false
```

Karuni calls these upstream endpoints:

- `GET ${KARUNI_UPSTREAM_URL}/models`
- `POST ${KARUNI_UPSTREAM_URL}/chat/completions`

Do not append `/chat/completions` to the environment value; the value must stop at `/v1`.

### Self-hosted 9Router on the Docker host

The Compose file maps `host.docker.internal` on Linux as well as Docker Desktop. If 9Router is listening on host port `20128`, use:

```dotenv
KARUNI_UPSTREAM_URL=http://host.docker.internal:20128/v1
KARUNI_UPSTREAM_KEY=<your local 9Router key>
KARUNI_ALLOW_INSECURE_UPSTREAM=true
```

Only enable insecure upstream HTTP on a trusted host or private Docker network. API keys and prompts are not protected when sent over untrusted HTTP. Prefer HTTPS for any upstream outside the machine.

### Synchronize and publish models

Karuni deliberately does not publish every upstream model automatically:

1. Sign in at `/admin/login`.
2. Open **Models & pricing**.
3. Click **Sync 9Router catalog**.
4. Existing seeded models remain disabled until an administrator enables them and confirms their customer-facing rates.
5. If a 9Router model is not in the seed catalog, click **Add model**, select its exact upstream source ID, provide a public model ID, and then configure pricing.

Verify 9Router directly if synchronization fails:

```bash
curl -fsS https://9router.com/v1/models \
  -H "Authorization: Bearer $NINE_ROUTER_API_KEY"
```

Then inspect Karuni logs:

```bash
docker compose logs --tail=200 app
```

### Optional second 9Router key

Karuni can route an explicit list of upstream model IDs through a second key:

```dotenv
KARUNI_UNCENSORED_KEY=<second key>
KARUNI_UNCENSORED_MODELS=["provider/model-one","provider/model-two"]
```

The list must be valid JSON and must contain exact upstream IDs. Leave the key empty and use `[]` when this split is not needed.

## 5. Enable Google Sign-In

Karuni uses Google Identity Services in browser callback mode and verifies the returned ID token on the server against Google's public JWKS. It needs a Web client ID but does not use or require a Google client secret.

Google's current setup guide is here: <https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid>.

1. In Google Cloud Console, create or select a project.
2. Configure the OAuth consent screen/Google Auth Platform branding, audience, and contact information.
3. Create an OAuth client with application type **Web application**.
4. Add the exact Karuni origin under **Authorized JavaScript origins**:
   - Local: `http://localhost:18786`
   - Production: `https://ai.example.com`
5. This integration does not use an OAuth redirect endpoint, so no Karuni callback URL is required under **Authorized redirect URIs**.
6. If the consent configuration is in testing mode, add the Google accounts that may sign in as test users.
7. Copy the client ID ending in `.apps.googleusercontent.com` into `.env`:

```dotenv
KARUNI_GOOGLE_CLIENT_ID=1234567890-example.apps.googleusercontent.com
```

For local Google testing, also set and browse the same hostname consistently:

```dotenv
KARUNI_ORIGIN=http://localhost:18786
```

Then restart the app:

```bash
docker compose up -d --build app
```

Important behavior:

- `KARUNI_ORIGIN` must exactly match the browser origin, including scheme and port.
- Production Google Sign-In must use HTTPS.
- Outbound HTTPS access to `accounts.google.com` and `www.googleapis.com` is required.
- An email already registered with password authentication cannot silently switch to Google authentication; the user must use the original method.
- Google sign-in creates a new customer account. It does not grant administrator access.

## 6. Production HTTPS with Caddy

Create an `A` and/or `AAAA` DNS record for your hostname pointing to the Docker host. Open inbound TCP ports `80` and `443`, plus UDP `443` if HTTP/3 is desired.

Set production values in `.env`:

```dotenv
KARUNI_DOMAIN=ai.example.com
KARUNI_ORIGIN=https://ai.example.com
KARUNI_BIND=127.0.0.1
```

Start Karuni, PostgreSQL, and Caddy:

```bash
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

Caddy obtains and renews the TLS certificate automatically. The app port remains bound to host loopback while Caddy reaches it over the Compose network.

If an existing load balancer or reverse proxy terminates TLS, use only `compose.yaml`, keep `KARUNI_ORIGIN` set to the public HTTPS origin, and proxy to `127.0.0.1:18786`. Preserve the `Host` header and do not rewrite paths.

The correct public origin is also required for administrator WebAuthn/passkey registration and CSRF origin checks.

## 7. PostgreSQL operations

The database is intentionally not published to a host port. Access it through Compose:

```bash
docker compose exec postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"
```

### Backup

```bash
docker compose exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc \
  > karuni-$(date +%F).dump
```

### Restore into a new empty database

```bash
docker compose exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  --clean --if-exists < karuni-YYYY-MM-DD.dump
```

Stop the app during a full restore to prevent concurrent writes:

```bash
docker compose stop app
# restore here
docker compose start app
```

Take a backup before image upgrades. Never remove the `postgres_data` volume unless deletion is intentional.

## 8. Environment reference

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_DB` | Yes | Database name; defaults to `karuni`. |
| `POSTGRES_USER` | Yes | Database owner; defaults to `karuni`. |
| `POSTGRES_PASSWORD` | Yes | URL-safe database password. |
| `KARUNI_POSTGRES_URL` | Compose-generated | PostgreSQL connection string used by the app. |
| `KARUNI_ORIGIN` | Yes | Exact externally visible origin used for cookies, CSRF, passkeys, and referral links. |
| `KARUNI_ADMIN_EMAIL` | Yes initially | Creates or identifies the master administrator. A legacy administrator at this email is promoted to master. |
| `KARUNI_ADMIN_PASSWORD` | Yes initially | Initial master password, minimum 16 characters. It does not reset an existing account. |
| `KARUNI_UPSTREAM_URL` | Yes for AI | 9Router base URL ending in `/v1`. |
| `KARUNI_UPSTREAM_KEY` | Yes for AI | 9Router API key. |
| `KARUNI_ALLOW_INSECURE_UPSTREAM` | No | Allows non-local HTTP upstreams; use only for trusted private development networking. |
| `KARUNI_GOOGLE_CLIENT_ID` | No | Google Identity Services Web client ID. |
| `KARUNI_REGISTRATION` | No | Set to `open` to permit email registration; use another value to close it. |
| `KARUNI_REFERRAL_ENABLED` | No | Enables referral codes and referral-to-wallet transfers when `true`. |
| `KARUNI_REFERRAL_RATE_BPS` | No | Referral rate in basis points; `1000` means 10%. |
| `KARUNI_IDR_PER_CREDIT` | No | Display conversion used by the customer workspace. |
| `KARUNI_UNCENSORED_KEY` | No | Optional second upstream key. |
| `KARUNI_UNCENSORED_MODELS` | No | JSON array of exact model IDs routed through the second key. |
| `KARUNI_DOMAIN` | Production Caddy only | Public hostname without scheme or path. |

After the first administrator login, close public registration if it is not required:

```dotenv
KARUNI_REGISTRATION=closed
```

Then restart the app.

## 9. Smoke tests

Check application and upstream-facing surfaces:

```bash
curl -fsS http://127.0.0.1:18786/health
curl -fsS http://127.0.0.1:18786/v1/models
docker compose ps
```

After creating a customer API key in the workspace and enabling a model:

```bash
curl -fsS http://127.0.0.1:18786/v1/chat/completions \
  -H "Authorization: Bearer kr_live_REPLACE_ME" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: smoke-test-001" \
  -d '{
    "model": "your-public-model-id",
    "messages": [{"role": "user", "content": "Reply with OK"}],
    "max_tokens": 16,
    "stream": false
  }'
```

Karuni intentionally supports non-streaming text chat on this endpoint. A `404` model response usually means the upstream catalog has not been synchronized, the source ID does not match, or the model is still disabled.

## 10. Production checklist

- [ ] Replace every placeholder in `.env`.
- [ ] Use a unique database password and administrator password.
- [ ] Run `npm run deploy:check` before Compose.
- [ ] Set `KARUNI_ORIGIN` to the exact public HTTPS origin.
- [ ] Keep PostgreSQL unexposed to the public network.
- [ ] Use HTTPS for 9Router unless it is on a trusted private network.
- [ ] Synchronize the 9Router catalog, review rates, and enable only intended models.
- [ ] Configure Google authorized JavaScript origins if Google Sign-In is enabled.
- [ ] Close public registration when onboarding is complete.
- [ ] Enroll an administrator passkey after HTTPS is active.
- [ ] Schedule encrypted, off-host PostgreSQL backups and test restoration.
- [ ] Monitor `docker compose logs`, disk use, upstream errors, and `/health`.
