---
tags: [decisions, project]
created: 2025-11-27
---

# Open Decisions

Forks that change the code. Defaults are marked **(Recommended)** and phase-locked as such until the user picks otherwise. Update this note when a decision lands.

| # | Decision | Options | Default | Blocking |
|---|----------|---------|---------|----------|
| D1 | **Deposit/rate model**: one multiplier `multiplier × KARUNI_IDR_PER_CREDIT` vs two configs `KARUNI_INPUT_IDR_PER_CREDIT` / `KARUNI_OUTPUT_IDR_PER_CREDIT` | one / two | **DECIDED 2025-11-27: blended** — the sheet price is per 1M tokens of input+output combined, so `models.input = models.output = sheet price`; charge = `(input+output) × price / 1M` ([[Catalog-Seed-Spec]]) | Seed pricing (phase 7) |
| D2 | **Credit accounting policy**: decimals (credits with 6 fractional digits, admin credits whole) vs integers (1 credit = Rp 1 internally, show `IDR = 1 credit`) | decimal / **integer** | **integer** — the sheet's comma decimals (`Rp 277,50`) survive exactly as `277_500_000` internal units; no float risk; `KARUNI_IDR_PER_CREDIT=1` | Referral fees + seed pricing |
| D3 | **Referral %**: pin 10% in env | `KARUNI_REFERRAL_RATE=0.10` | 10% of *deposits* per the ask | Referral math (phase 3) |
| D4 | **Referral cap**: limit referral lifetime earnings | default: no cap | admin overrides per user if needed | Payouts (phase 3) |
| D5 | **Catalog seeding mechanism**: boot seed (server reads `seed-catalog.csv` at startup, upserts only ids not already in `models`; admin still controls `enabled` + prices) | boot seed / admin upload | **boot seed** — idempotent, works before the router is reachable | Catalog seed (phase 7) |
| D6 | **2FA scope**: admin-only vs all users | admin-only / all users | **all users** (the ask says "2FA can be activated" with GOTP) | GOTP (phase 5) |
| D7 | **Stripe/payment integration**: build now vs keep payments-disabled | deferred / now | **deferred** — checkout engineering is declared "not available" everywhere in the current code; referral deposits continue via admin adjustment | Payout "real deposits" (phase 3+, revisit later) |

## Ties to existing code

- D1/D2 hook into `KARUNI_IDR_PER_CREDIT`, already read as `idrPerCredit` in `server.mjs` `/api/usage` and rendered by `workspace.js` ("Rp …" formatting). Implementing D2 changes only that divisor (1 = internal unit).
- D3–D4 become env vars so the payout math stays config-driven.
- D5 needs a fixed seed file path — spec in [[Catalog-Seed-Spec]].
- D6 means the "Users" tab in the admin console may need a "reset/clear 2FA" action per user (missing from current admin UI).
- D7: refer to the integration status cards in the business control center (`payments: 'not_integrated'`).