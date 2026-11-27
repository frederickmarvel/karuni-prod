---
tags: [catalog, pricing, tasks, backend]
created: 2025-11-27
---

# Catalog Seeding & Pricing — Spec

Source of truth: **`price - Sheet1.csv`** (74 rows, Rp per 1M tokens, comma decimals). Prefixes `wz/`, `cx/`, `ag/` are upstream/router ids and MUST be stripped before they enter the Karuni model table — the ask says "remove the prefix `wz/` for any of our listed models"; in fact all three prefixes are upstream identifiers and the existing redaction filter ([`branding.mjs`](Karuni/branding.mjs)) would silently drop them anyway. Details in [[Catalog-Model-Mapping]].

## Blended pricing model (confirmed 2025-11-27)

The sheet price is **per 1M tokens, input + output combined**. Example: 100k input + 50k output = 150k tokens → `150_000 / 1_000_000 × price`. The user confirmed this explicitly; implement it as `input = output = price` per model. The billing engine already does this: [store.mjs:27](Karuni/store.mjs#L27) settles `amount = input × m.input + output × m.output` → with equal rates that equals `(input+output) × price / 1M`.

## Pipeline

1. [ ] Copy the CSV to a known path, normalized: `Karuni/data/seed-catalog.csv`.
2. [ ] Normalization (script `Karuni/scripts/normalize-catalog.mjs`, run manually, output committed):
   - [ ] strip `wz/`, `cx/`, `ag/` prefixes → the id stored in DB & published to users.
   - [ ] id and upstream `source` kept separate — `models.source` holds the ORIGINAL upstream id (needed to fetch from router), `models.id` the public stripped id (shown + used in `/v1/chat/completions`).
   - [ ] id sanitization: lowercase already; ensure slug matches `/^[a-z0-9][a-z0-9._-]{0,100}$/`.
   - [ ] price parsing: `"Rp 277,50"` (thousands dot, decimals comma) → integer internal units per 1M tokens = `round(price × 1_000_000)` (Rp-per-1M → internal-unit-per-1M; `floor` for the per-call charge later, to keep integer-safe rounding consistent).
   - [ ] `uc-` ids are the uncensored family studies: they map through the same pipeline (the router prefixes `uc-…` for the uncensored pool).
3. [ ] Boot seed in `server.mjs` at startup (decision D5 in [[Open-Decisions]]):
   - [ ] reads `seed-catalog.csv`;
   - [ ] ONLY inserts rows whose id does NOT yet exist in `models` (admin stays in control of `enabled` + pricing).
   - [ ] default `enabled=0`, **`input = output` = the sheet's blended price per 1M** — because charge = `(input+output)/1M × price`.
   - [ ] a model's price is editable at any time by admin (existing `/api/admin/pricing`).

## Example charge (billing formula to implement + document)

Input 100k tokens, output 50k tokens, model price Rp 277,50:
`(100_000 + 50_000) / 1_000_000 × Rp 277,50 = Rp 41,63` (i.e. `150_000 × 277_500_000 / 1_000_000 = 41_625_000` internal units).

## Seed row format

| column | example | notes |
|--------|---------|-------|
| id (public) | `deepseek-v4-pro-0813` | prefix stripped |
| source (upstream) | `wz/deepseek-v4-pro-0813` | prefix kept here only |
| name | `DeepSeek V4 Pro` | human label |
| family | `DeepSeek` | from [[Catalog-Model-Mapping]] |
| description | `Rp900/1M · blended` | optional |
| input / output | `900_000_000` | internal units per 1M tokens, equal |
| maxIn / maxOut | `262144` / `32768` | sane defaults |

## Admin workflow after seeding

- [ ] Admin console Models & pricing tab shows all seeded rows (from both stores — seeded PG & SQLite get the same script output).
- [ ] `Sync` remains the ONLY way to flip a model to `enabled=1` if its source is not in `inventory` (the `model()` guard in both stores), so: run `Sync` after the router is healthy → then enable.
- [ ] Cross-check the *published* catalog (users' `/api/catalog`) never contains prefixed ids — the redaction filter is the backstop; assert in QA that the seeded set passes `publicModels()`.

## QA

- [ ] Verify the full normalized csv — 74 rows, every id valid, every price an integer internal unit.
- [ ] Boot seed run twice → no duplicates (idempotency).
- [ ] Boot seed run with existing model row → no overwrite of admin's pricing (`ON CONFLICT DO NOTHING`).

Related: [[Catalog-Model-Mapping]], [[Open-Decisions#D1]], [[Open-Decisions#D2]], [[Open-Decisions#D5]].