---
tags: [design, ui, tasks]
created: 2025-11-27
---

# UI Rollout — Retro-Brutalism, Page by Page

Data layers land first (phases 1–3), then visuals (phase 4). One page at a time, each finished visually before the next starts; every page checked against [[Responsive-Verification]].

## Sequencing

1. **Tokens + primitives (foundation)** — `style.css` gets the variables + `.btn/.panel/.field/.table` from [[Component-Spec]]; then both themes in `admin.css`/`workspace.css` reference the same variables so light/dark keeps working.
2. **Landing page** (`index.html` + `style.css`) — biggest visible win:
   - [ ] Hero: replace hero copy section per [[Retro-Brutalism-Tokens]]; decide 3D knot ([[Retro-Brutalism-Tokens#Deliberate exclusions]]) → keep isolated or replace with a typographic hero × catalog grid.
   - [ ] Catalog section: `.table` render of `/api/catalog` with the new tokens (includes seeded `price - Sheet1.csv` models once phase 7 fires).
   - [ ] Showcase (`showcase.json` / `/brands/*`) → keep the filters but render `.mcard` in the new style; logos stay.
   - [ ] Docs/curl block: reverse-block code panel, copy button per [[Component-Spec#Buttons]].
3. **Auth** (`index.html` login/register + `auth.html` Google page) → panel forms with chunky fields. Add the referral invite-code field (see [[Referral-Flows]] — plan UI change here; wire after phase 3).
4. **Dashboard** (`workspace.js` + `workspace.css`) — sidebar, `.metrics`, tables, chart bars in tokens; chart tooltip/output row remains.
5. **Admin console** (`admin.html`, `admin-ui.js`, `control-ui.js`, `admin.css`) —
   - [ ] Tabs as chunky toggles.
   - [ ] Replace `prompt()` flows with an in-page modal ([[Component-Spec#Prompt flows]]).
   - [ ] Business-center `<details>` sections keep their behavior; restyled panels.
   - [ ] Add referral management section (see [[Referral-Flows#Admin payout UI]]).
   - [ ] Add 2FA management (see [[GOTP-Plan#Admin affordances]]).
6. **Support widgets** (`connection.js`, `customer-support.js`) — token classes only.
7. **Status/loading** (`karuni-loading.css` + `#status`) — restyle, keep the fade behavior.

## Cross-cutting UI checklist

- [ ] Every page has a visible focus ring, and every interactive element ≥ 44px.
- [ ] Light/dark parity: admin toggles both ways; marketplace follows `prefers-color-scheme` or the existing theme system — no hard-coded colors outside tokens.
- [ ] Numbers right-aligned, tabular; no `,` vs `.` formatting drift (use existing `Intl.NumberFormat`, not hand-rolled).
- [ ] Strings that look broken stay out: `wz/`-prefixed ids must never render; catalog id column shows stripped ids only ([[Catalog-Model-Mapping]]).
- [ ] Screenshot review at 320 / 768 / 1024 / 1440 before sign-off of each page ([[Responsive-Verification]]).