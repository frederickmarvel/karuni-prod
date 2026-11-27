---
tags: [catalog, pricing, reference]
created: 2025-11-27
---

# Catalog Model Mapping — exact seeded rows from `price - Sheet1.csv`

Seed list = sheet minus the collision removals locked on 2025-11-27 ([[Model-Admin-Control#2025-11-27 decisions (locked)]]): the two colliding names (`gpt-5.6-luna`, `gpt-6-luna` — each existed under both `cx/` and `wz/`) are **removed entirely** (4 rows dropped). **70 rows will be seeded.**

**Blended pricing**: the price column applies per 1M tokens of input+output combined. Billing: `charge = (input + output) × price / 1_000_000`; in the DB both `models.input` and `models.output` get the same value (internal units per 1M) — see [[Catalog-Seed-Spec]].

- `Public id` = prefix stripped (what customers see & send to `/v1/chat/completions`).
- `Upstream source` = original id in the router (what Karuni forwards as `model`).
- `Blended Rp / 1M` = sheet price (input+output combined).
- Prefixes stripped: `wz/` (51→49 rows after removals), `cx/` (13→11), `ag/` (2), none (8).

## Anthropic (7)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `claude-haiku-5.5` | `claude-haiku-5.5` | Rp 900 |
| 2 | `claude-opus-4.7` | `claude-opus-4.7` | Rp 1,800 |
| 3 | `claude-opus-4.8` | `claude-opus-4.8` | Rp 1,980 |
| 4 | `claude-opus-5` | `claude-opus-5` | Rp 2,700 |
| 5 | `claude-opus-5.5` | `claude-opus-5.5` | Rp 3,960 |
| 6 | `claude-sonnet-4-6` | `ag/claude-sonnet-4-6` | Rp 900 |
| 7 | `claude-sonnet-5.5` | `claude-sonnet-5.5` | Rp 2,160 |

## DeepSeek (8)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `deepseek-v4-flash` | `wz/deepseek-v4-flash` | Rp 300 |
| 2 | `deepseek-v4-flash-0731` | `wz/deepseek-v4-flash-0731` | Rp 262.50 |
| 3 | `deepseek-v4-pro` | `wz/deepseek-v4-pro` | Rp 412.50 |
| 4 | `deepseek-v4-pro-0813` | `wz/deepseek-v4-pro-0813` | Rp 900 |
| 5 | `deepseek-v4.1-flash` | `wz/deepseek-v4.1-flash` | Rp 300 |
| 6 | `deepseek-v4.1-flash-1017` | `wz/deepseek-v4.1-flash-1017` | Rp 720 |
| 7 | `uc-deepseek-v4.1-flash` | `wz/uc-deepseek-v4.1-flash` | Rp 1,440 |
| 8 | `uc-deepseek-v4.1-flash-1017` | `wz/uc-deepseek-v4.1-flash-1017` | Rp 1,800 |

## Google (7)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `gemini-3.7-flash` | `wz/gemini-3.7-flash` | Rp 375 |
| 2 | `gemini-3.8-flash` | `wz/gemini-3.8-flash` | Rp 375 |
| 3 | `gemini-3.8-flash-high` | `wz/gemini-3.8-flash-high` | Rp 487.50 |
| 4 | `gemini-pro-agent` | `wz/gemini-pro-agent` | Rp 487.50 |
| 5 | `gemma-4-26b` | `wz/gemma-4-26b` | Rp 225 |
| 6 | `gemma-4-e2b` | `wz/gemma-4-e2b` | Rp 150 |
| 7 | `uc-gemma-4` | `wz/uc-gemma-4` | Rp 720 |

## MiniMax (2)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `minimax-m3` | `wz/minimax-m3` | Rp 300 |
| 2 | `minimax-m3.1-flash` | `wz/minimax-m3.1-flash` | Rp 300 |

## Moonshot / Kimi (4)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `kimi-k2.6` | `wz/kimi-k2.6` | Rp 150 |
| 2 | `kimi-k2.7` | `wz/kimi-k2.7` | Rp 150 |
| 3 | `kimi-k2.7-code` | `wz/kimi-k2.7-code` | Rp 300 |
| 4 | `kimi-k3` | `wz/kimi-k3` | Rp 412.50 |

## NVIDIA (1)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `nemotron-3-super-120b` | `wz/nemotron-3-super-120b` | Rp 300 |

## OpenAI (16)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `codex-auto-review` | `cx/codex-auto-review` | Rp 360 |
| 2 | `gpt-5.6-luna-review` | `cx/gpt-5.6-luna-review` | Rp 900 |
| 3 | `gpt-5.6-sol` | `cx/gpt-5.6-sol` | Rp 1,620 |
| 4 | `gpt-5.6-sol-review` | `cx/gpt-5.6-sol-review` | Rp 1,800 |
| 5 | `gpt-5.6-terra` | `cx/gpt-5.6-terra` | Rp 1,260 |
| 6 | `gpt-5.6-terra-review` | `cx/gpt-5.6-terra-review` | Rp 1,440 |
| 7 | `gpt-6-astra` | `cx/gpt-6-astra` | Rp 2,520 |
| 8 | `gpt-6-luna-pro` | `wz/gpt-6-luna-pro` | Rp 720 |
| 9 | `gpt-6-sol` | `cx/gpt-6-sol` | Rp 540 |
| 10 | `gpt-6.1-sol` | `cx/gpt-6.1-sol` | Rp 720 |
| 11 | `gpt-6.1-terra` | `cx/gpt-6.1-terra` | Rp 540 |
| 12 | `gpt-6.2-astra` | `gpt-6.2-astra` | Rp 2,700 |
| 13 | `gpt-6.2-sol` | `gpt-6.2-sol` | Rp 1,080 |
| 14 | `gpt-oss-120b-medium` | `ag/gpt-oss-120b-medium` | Rp 540 |
| 15 | `gpt-oss-20b` | `wz/gpt-oss-20b` | Rp 112.50 |
| 16 | `gpt-reserve` | `cx/gpt-reserve` | Rp 720 |

## Other (10)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `hy3` | `wz/hy3` | Rp 262.50 |
| 2 | `hy4-preview` | `wz/hy4-preview` | Rp 337.50 |
| 3 | `muse-ember` | `wz/muse-ember` | Rp 375 |
| 4 | `muse-spark-1.3-contributor` | `wz/muse-spark-1.3-contributor` | Rp 172.50 |
| 5 | `pria-solo-utara` | `wz/pria-solo-utara` | Rp 300 |
| 6 | `saycol-pro-max` | `wz/saycol-pro-max` | Rp 150 |
| 7 | `uc-venice-1.2` | `wz/uc-venice-1.2` | Rp 1,080 |
| 8 | `uc-venice-roleplay` | `wz/uc-venice-roleplay` | Rp 2,160 |
| 9 | `weizerouter-image` | `wz/weizerouter-image` | Rp 150 |
| 10 | `weizerouter-v1` | `wz/weizerouter-v1` | Rp 300 |

## Qwen (6)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `mimo-v2.6-flash` | `wz/mimo-v2.6-flash` | Rp 262.50 |
| 2 | `mimo-v2.6-pro` | `wz/mimo-v2.6-pro` | Rp 487.50 |
| 3 | `qwen-3.8-max` | `wz/qwen-3.8-max` | Rp 1,188 |
| 4 | `qwen3.7-flash` | `wz/qwen3.7-flash` | Rp 277.50 |
| 5 | `qwen3.8-flash` | `wz/qwen3.8-flash` | Rp 262.50 |
| 6 | `uc-qwen3.6-plus` | `wz/uc-qwen3.6-plus` | Rp 3,600 |

## Zhipu / GLM (3)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `glm-5.3` | `wz/glm-5.3` | Rp 337.50 |
| 2 | `glm-5.3-flash` | `wz/glm-5.3-flash` | Rp 262.50 |
| 3 | `uc-glm-5.3-flash` | `wz/uc-glm-5.3-flash` | Rp 2,124 |

## xAI / Grok (6)
| # | Public id | Upstream source | Blended Rp / 1M |
|---|---|---|---|
| 1 | `grok-3` | `wz/grok-3` | Rp 225 |
| 2 | `grok-4` | `wz/grok-4` | Rp 300 |
| 3 | `grok-4-fast-reasoning` | `wz/grok-4-fast-reasoning` | Rp 225 |
| 4 | `grok-4.5` | `wz/grok-4.5` | Rp 375 |
| 5 | `grok-4.6` | `wz/grok-4.6` | Rp 375 |
| 6 | `grok-4.7` | `wz/grok-4.7` | Rp 450 |

---

## Hard flags before the seed runs

1. **Collisions — DECIDED 2025-11-27: remove the collision models.** `gpt-5.6-luna` and `gpt-6-luna` (both existed under `cx/` AND `wz/` at different prices) are dropped from the seed entirely — all 4 rows removed. Result: 70 seeded rows. Related `-luna-review` and `gpt-6-luna-pro` rows stay (they're unique).
2. **Redaction trap**: `weizerouter-v1` and `weizerouter-image` match the internal redaction regex (`weize…router` in `branding.mjs`) even after the `wz/` strip — `publicModels()` will silently drop them, and any chat content containing them fails validation. If you want them public, the public id must differ from the upstream id; keep the raw upstream id only in `models.source`.
3. Family mapping for `mimo-*` (grouped under Qwen), `muse-*` / `pria-*` / `saycol-*` / `hy*` (Other) is provisional — adjust in the seed script if your branding wants different labels.
4. `uc-…` rows are the uncensored pool; they flow through the SAME seed pipeline (also `wz/`-prefixed), so confirm they're served by `KARUNI_UNCENSORED_KEY`/`KARUNI_UNCENSORED_MODELS` on the router before enabling them.