---
tags: [design, components, ui]
created: 2025-11-27
---

# Component Spec — Retro-Brutalism Primitives

Shared visual language for every page. CSS classes live in `style.css`; the few dynamic helpers remain in each page's JS. Two sizes (desktop / mobile). All components obey [[Retro-Brutalism-Tokens]].

## Buttons `.btn`

- primary = solid `--accent` bg, `--ink` text; secondary/ghost = transparent bg, `2px` border, hard shadow.
- `min-height: 44px` (touch target), `padding: 0 20px`, uppercase, bold, mono?
- Disabled: flat (no shadow), `--disabled` text.
- Loading affordance: text becomes `[……]` or keeps label with a `▦` — pick one (see below).

## Inputs `.field`

- Input/select/textarea: 2px border, no shadow inside; focus = 3px `--accent` outline with 1px `--bg` gap (visible in both themes).
- Labels above fields, bold, uppercase, small.
- Error text under field: mono, prefixed `!` and `--danger`.
- Checkbox/radio as chunky `[ ] → [▣]`-style squares (real inputs stay screenreader/role correct: use `appearance: none` + aria labels; never div-hacks).

## Cards & tables

- `.panel`: `2px` border, `4px 4px 0` shadow, `16px` padding, no radius.
- `.cards`: metric row, `3` across desktop, `1` mobile.
- `.table`: header row bold uppercase mono; row dividers `1px`; numbers right-aligned `tabular-nums`.
- Table overflow: keep `.scrolltable` wrapper (horizontal scroll on narrow screens).

## Header & nav

- Top bar: `--bg` on `--ink` strip (inverted from body) for the main marketplace; dashboard keeps its left sidebar pattern.
- Nav links: uppercase, bold, `2px` underline on hover, active = inverse underline block.
- Sidebar (dashboard): items numbered `01…10` mono, active item gets accent left-rule `4px`.

## Feedback

- Toast/status = mono line at bottom edge (`<p id="status">` exists on all pages already): `» message`, hides after 4.2s. Keep the markup, restyle.
- `.empty`: dashed `2px` border box, centered mono text ("NO KEYS YET").

## Prompt flows (admins)

Reason/password prompts in `admin-ui.js` are *behavior*, not visuals: to make them tidy, replace `prompt()` with an in-page modal built from the primitives (`[Reason / Password / Apply]`), same validations reused. That removes dinging triple-prompts on every pricing change. Covered in [[UI-Rollout]].

## Monospace accents

Where data is short: keys (`kar_…`), model ids, request ids, timestamps, balances → all mono + tabular. When a key is shown-once, render in a reverse block (`--ink` bg, `--bg` text) for copyability.

## A11y checklist (non-negotiable)

- Contrast per token pairs ≥ 4.5:1 for text (check `--ink` on `--surface`, `--accent` on `--ink`).
- Focus visible everywhere; only semantic inputs/buttons.
- `prefers-reduced-motion` respected per tokens spec.
- Modal prompts trap focus; Esc closes.

## Suggested CSS skeleton

```css
:root{ /* palette from Retro-Brutalism-Tokens */ }
.btn{ border:2px solid var(--ink); box-shadow:4px 4px 0 0 var(--ink); text-transform:uppercase; font-weight:700; min-height:44px; padding:0 20px; background:var(--surface); color:var(--ink); }
.btn.primary{ background:var(--accent); color:var(--ink); }
.btn:hover{ transform:translate(-1px,-1px); box-shadow:6px 6px 0 0 var(--ink); }
.btn:active{ transform:translate(2px,2px); box-shadow:1px 1px 0 0 var(--ink); }
.panel{ border:2px solid var(--ink); box-shadow:4px 4px 0 0 var(--ink); padding:16px; background:var(--surface); }
.field input,.field textarea,.field select{ width:100%; border:2px solid var(--ink); background:var(--bg); color:var(--ink); padding:10px 12px; }
.field input:focus{ outline:3px solid var(--accent); outline-offset:1px; }
.status{ font-family:var(--mono); }
```

Full implementation belongs to [[UI-Rollout]], page by page.