---
tags: [moc, home]
created: 2025-11-27
---

# Karuni — Build Vault

Planning vault for turning the current Karuni storefront into the target product. The code lives in `/Users/frederickmarvel/karuni/Karuni`.

## Start here

- [[Roadmap]] — phase order, dependencies, what to build first
- [[Open-Decisions]] — every fork that needs a decision before/while building
- [[README]] — existing scope review of the current code (what's complete, what's missing)

## Workstreams

| # | Stream | Docs | Status |
|---|--------|------|--------|
| 1 | Retro-brutalism UI | [[Retro-Brutalism-Tokens]] · [[Component-Spec]] · [[UI-Rollout]] | planned |
| 2 | Responsive & tidy UI (verified) | [[Responsive-Verification]] | planned |
| 3 | User API endpoints (usage / ledger / balance) | [[User-Endpoints]] | planned |
| 4 | API key prefix `kr-live_…` | [[Key-Prefix-Change]] | planned |
| 5 | Referral / reseller (10% deposit fee, manual payout) | [[Referral-Data-Model]] · [[Referral-Flows]] · [[Referral-Tasks]] | planned |
| 6 | 2FA with GOTP (TOTP) | [[GOTP-Plan]] | planned |
| 7 | Catalog & pricing from the price sheet, `wz/` stripped | [[Catalog-Seed-Spec]] · [[Catalog-Model-Mapping]] · [[Model-Admin-Control]] | planned |

## Shared context

- [[Deployment]] — router-as-Docker-upstream constraints (loopback/HTTPS whitelist, env vars) ← to be written
- Source CSV: `price - Sheet1.csv` (master price list, **blended** Rp per 1M tokens — input+output combined, confirmed by user 2025-11-27)
- Current code quirks to respect: trial hardcode `uid:'9'`, Postgres-only admin console, `https://karuni.app` origin hardcodes, upstream id redaction in `branding.mjs`

## Conventions for this vault

- Tasks are `- [ ]` checkboxes; tick them as implementation progresses.
- "Touch" lists name file:line — they go stale; re-grep `kar_live_`, `adjust`, `catalog` before editing.
- Prices: IDR with comma decimals → stored as **integer internal units** (`round(IDR × 1e6)`, 1 credit = Rp 1 policy default, see [[Open-Decisions]]).