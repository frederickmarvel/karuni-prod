---
tags: [2fa, gotp, totp, security, backend]
created: 2025-11-27
---

# GOTP 2FA Plan (TOTP)

"2FA can be activated — using GOTP" → standard TOTP over the GOTP app (Google/Microsoft Authenticator compatible; GOTP offers the QR code). How it fits the existing auth.

## Existing auth recap

- Session cookie `karuni_session` (hashed in DB, 8h), password login via scrypt (SQLite / PG).
- Admin console adds WebAuthn passkeys ([`admin.mjs`](Karuni/admin.mjs)) for the *admin* role.
- 2FA here is per-user for *everyone* in addition to password (decision D6, [[Open-Decisions]]).

## Data model (additive)

| table/column | notes |
|--------------|-------|
| `users.totp_secret` TEXT NULL | store base32 secret (encrypted at rest) |
| `users.totp_enabled` BOOLEAN DEFAULT false | opt-in flag |
| `totp_backup_codes` table | uid, code-hash, used_at — one-time recovery codes |

- Secret permitted only once enabled; disabled → column cleared.
- Backup codes generated (e.g. 8 codes) at activation, shredded after use.

## Endpoints

- `POST /api/2fa/setup` → returns `{secret, otpauth, qrDataUrl}` (QR rendered client-side or by GOTP).
- `POST /api/2fa/confirm` → `{code, password}`; verifies TOTP **within time-step skew + one prior step** and current password → saves secret, sets enabled, returns backup codes (shown once).
- `POST /api/2fa/disable` → `{code or recovery, password}`.
- Sign-in (`POST /api/login`, `/api/google` fallback): if `totp_enabled`, do NOT set session; return `require_2fa: true` + a 2FA challenge; `POST /api/2fa/complete` verifies the code → session cookie issued. Session tokens never minted before 2FA confirms.
- Admin safety valve: `/api/admin/2fa-reset` (reason + password, existing `confirmAdmin` pattern) for flooded users; SMART-lock users are prompted with recovery code flow.

## GOTP specifics / integration

- [ ] Use the GOTP-issued secret in base32; the step is 30s, 6 digits, SHA-1 default — interop with Google Authenticator / Microsoft Authenticator / Authy.
- [ ] QR content: `otpauth://totp/Karuni:<email>?secret=<base32>&issuer=Karuni&digits=6&period=30` — QR rendered via a client lib (GOTP does not depend on a specific client) or the existing `webauthn-browser.js`-style vendored script.
- [ ] Do NOT accept codes older than one period (no infinite skew); store `last_used_counter` per user to reject OTP replay.

## UI touch points

- [ ] Settings tab in the user dashboard ([[UI-Rollout#4]]) — activate/deactivate 2FA + backup-code display + copy.
- [ ] Login — after password step, show the OTP input (existing auth pages get the extra step).
- [ ] Admin overlay per D6 — user list "2FA" column + reset action in admin console [[UI-Rollout#5]].

## Edge cases

1. Recovery codes are one-time, hashes stored (same hashing as passwords).
2. 2FA + Google sign-in combination: on a 2FA-enabled account, Google alone must NOT mint a session without the TOTP step (same challenge).
3. 2FA + admin passkeys: admin-only accounts can keep both; passkey login bypass TOTP policy? Decide: default **passkey stays sufficient only if no TOTP is enabled; if TOTP enabled, always require it** (fail closed).
4. Clock skew: accept ±1 step (per verification), correct by server time.

## Effort note

Standard TOTP is self-contained: no third-party API, no SMS cost. Keeping replay windows tight is the only thing to be careful about.