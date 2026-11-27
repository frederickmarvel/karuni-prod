---
tags: [design, ui, retro-brutalism]
created: 2025-11-27
---

# Retro-Brutalism Design Tokens

Design system for "clean look, retro brutalism" applied across all pages (marketplace, dashboard, auth, admin console, support). One set of tokens, one [[Component-Spec]], many pages.

## Concept

- **Retro**: near-monochrome dense text, strong borders, offset hard shadows, chunky type, ASCII/terminal accents (status line, `[ ]` toggles, `▣`, `╳`, `▶`).
- **Brutalism**: raw grid, exposed structure, no soft radius bloat, no gradient.
- **Clean**: generous whitespace, strong vertical rhythm, everything aligned to a visible grid; ONE accent; no clutter.
- **Tidy**: identical spacing everywhere, tabular numbers, consistent button/input sizes, no hacks.

Contrast balance (brutalism tends to shout): muted surface + dark prints + **one** loud accent. Not rainbow.

## Tokens

### Palette

| Token | Dark (default) | Light | Use |
|-------|-----------------|-------|-----|
| `--bg` | `#f2e9dc` | `#11110f` | page background |
| `--surface` | `#fdf7ec` | `#1d1c18` | cards, panels, tables |
| `--ink` | `#191510` | `#f0ead8` | primary text |
| `--ink-dim` | `#5c5344` | `#9a9180` | secondary text, labels |
| `--line` | `#191510` | `#f0ead8` | borders, dividers |
| `--accent` | `#e8491d` | `#ff6a35` | orange-red (single accent) |
| `--disabled` | `#b7ad9b` | `#3a372f` | disabled / placeholder |
| `--success` | `#1d7a34` | `#49d16d` | confirmed / success only |
| `--danger` | `#b2201c` | `#ff5a52` | errors, destructive only |

### Spacing & rhythm

- Base unit `--s: 8px`. Scale: `4 / 8 / 12 / 16 / 24 / 32 / 48 / 64`.
- Grid: 12 columns, max-width `1200px`; gutters `24px` desktop, `16px` tablet, `12px` phone.
- Vertical rhythm: heading-to-body gap `16px`, section gap `48px` desktop / `32px` mobile.

### Type

- Body: system stack (`-apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`), `16px / 1.55`.
- Headings: **extra-bold, uppercase, tight letter-spacing** (`font-weight 800; letter-spacing 0.01em; text-transform uppercase`).
- Mono (numbers, ids, keys, times, statuses): keep existing Geist Mono (`fonts/geist-mono-latin-wght-normal.woff2`) `14px`; tabular via `font-variant-numeric: tabular-nums`.

### Shape & borders

- Radius: `2px` max on UI chrome; `0` on panels/tables. No pills.
- Borders: `2px solid var(--line)` on panels, `1px` on inner dividers.
- Hard shadows: `4px 4px 0 0 var(--ink)` (desktop); `2px 2px 0 0` (mobile).
- Hover/pressed: translate `(-1px,-1px)` + shadow grows `6px 6px`; pressed translates down `(2px,2px)` with shadow `1px 1px` (buttons feel mechanical, like keys).

### Motion

- Durations `120ms / 180ms` ease-out only; no bounce, no parallax.
- Page load: keep existing loading bar; add a one-line ASCII "boot" status on admin (optional, in [[UI-Rollout]]).
- `prefers-reduced-motion: reduce` → disable shadows/translation, instant transitions.

## Files to touch

- [ ] `public/style.css` — palette + tokens; `workspace.css` and `admin.css` override with the same variables (they already are theme-switchable for the admin).
- [ ] `index.html` — replace the hero/section markup (see [[UI-Rollout]]); keep `meta theme-color` in sync with `--bg`.
- [ ] `admin.html` + `control-ui.js`/`admin-ui.js` — panels, cards, tables, and prompt-based reason/password flows keep their logic; only markup/class changes.
- [ ] `workspace.js` — sidebar + cards use token classes; keep draw/label logic untouched.
- [ ] `connection.js` + `customer-support.js` — same primitive classes.

## Deliberate exclusions

The 3D knot hero (`hero.mjs`) stays as-is unless the landing redesign wants it gone; it's isolated to the hero and already respects the page otherwise. Decision belongs to the [[UI-Rollout]] review step.