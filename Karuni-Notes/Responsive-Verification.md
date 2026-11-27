---
tags: [qa, responsive, ui]
created: 2025-11-27
---

# Responsive & Tidy Verification

"check to me" — how to prove it. Bake checks into the rollout, per page ([[UI-Rollout]]), then a full pass in phase 8.

## Definition of tidy for Karuni

1. No horizontal page scroll at any width (a table may scroll inside its own `.scrolltable` — acceptable; the page may not).
2. No overlapping text or clipped controls at 320px–1440px+.
3. Touch targets ≥ 44px; no double-tap surprises on mobile.
4. Consistent spacing (single scale, [[Retro-Brutalism-Tokens#Spacing & rhythm]]): identical gutters, vertical rhythm, and panel padding everywhere.
5. Both themes pass (dark + light), including focus states.

## Breakpoint matrix per page

| Page | 320 | 360 | 768 | 1024 | 1440+ |
|------|-----|-----|-----|------|-------|
| Landing (hero, catalog, showcase, pricing, docs) | single col, stacked nav | same | 2-col sections | catalog full | grid max 1200px centered |
| Auth (login/register, Google) | panel full-width, buttons stack | same | 420px centered panel | same | same |
| Dashboard (sidebar + 10 tabs) | `.drawer` mode (sidebar toggles) — verify ☰ button | same | `.compact` sidebar icons | full sidebar | same |
| Admin console (tabs, cards, tables, modals) | cards 1 col, tabs scroll/strip | same | cards 2 col | cards 3 col | same |
| Admin login | same as auth | same | 420px centered | same | same |

## Check procedure (repeat after each page)

1. Screenshot/probe at each breakpoint (Chrome DevTools device toolbar: iPhone SE 375, and 320 via extension; tablet 768; desktop 1024/1440).
2. Checklist:
   - [ ] No page-level horizontal scroll.
   - [ ] No clipped labels — Indonesian price formatting (`Rp 2.700`) and long model ids wrap or mono-ellipsize.
   - [ ] Status line not overlapping footer/CTA at bottom.
3. Accessibility addition to "check":
   - [ ] Keyboard order of modal prompts (reason/password) after replacing `prompt()` in [[UI-Rollout]].
   - [ ] Contrast run on "--ink on --surface" and "--accent on --ink" in both themes.

## Known hazards to watch (from current code)

- **Table widths**: admin usage/audit tables are wide; they must be `.scrolltable` (hint: `table()` in `admin-ui.js` already wraps `.scroll`).
- **`<pre id="new-key">`**: key strings overflow narrow panels — must wrap in the reverse block ([[Component-Spec#Monospace accents]]).
- **Business-center `<details>` sections** are long vertical forms — calendar/datetime inputs at 320px clip if padding isn't reduced; verify.
- **Prompt modals in `admin-ui.js`** are currently native `prompt()`s — replacing them ([[UI-Rollout#5]]) removes OS-driven sizing issues.
- **Hero 3D canvas**: if kept, ensure the canvas container div scales (`aspect-ratio`) and doesn't force scroll.

## Definition of done

All checkboxes ticked at the last pass (phase 8), recorded here with date + screenshot names.