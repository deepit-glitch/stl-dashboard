# STL Auth Worker

Backend for every dashboard in this repo: OTP login, sessions, KPI data, manpower data.
Deployed at `https://square-flower-57b5.deepit.workers.dev`.

## History

This Worker was originally written and deployed **through the Cloudflare dashboard**, not from
source control — there was no local copy on any machine, and no repo. The source here was
recovered on **2026-07-17** by downloading the live script from the Cloudflare API, and is now
the source of truth. **Deploy from here, never from the dashboard editor again** — a dashboard
edit will be silently overwritten by the next `wrangler deploy`.

## Deploying

```sh
npx wrangler deploy          # from this directory
```

Requires `wrangler login` (one-time, opens a browser).

## Secrets

`TWOFACTOR_KEY` — the 2Factor.in API key used to send OTP SMS. It is **not** in this repo, which
is public. Set it once per Worker:

```sh
npx wrangler secret put TWOFACTOR_KEY
```

If it is ever missing, `sendOTP()` silently fails and every login breaks with
"SMS failed - please retry".

## Storage

One KV namespace, `STL_AUTH`, bound as `AUTH_KV`. Everything is prefix-keyed:

| Prefix | Value |
|---|---|
| `user:{mobile}` | `{mobile, name, role, dept, added, lastLogin}` |
| `sess:{token}` | `{mobile, role, name, dept, created}` — TTL 8h |
| `otp:{mobile}` | 6-digit OTP — TTL 10min |
| `otpat:{mobile}` | failed verify attempts for the current OTP — TTL 10min |
| `otprl:{mobile}` | `{n, first, last}` send-OTP rate limit window — TTL 1h |
| `kpidata:{dept}:{YYYY-MM}` | KPI entries for a dept-month |
| `manpower:{YYYY-MM-DD}` | one day's headcounts |

KV is eventually consistent, so `otpat:`/`otprl:` counters are approximate. They are a
brute-force/spend deterrent, not an exact limiter.

## SMS

2Factor.in, template **`OTP1`**:
`https://2factor.in/API/V1/{key}/SMS/{mobile}/{otp}/OTP1`

## Notes

- `Access-Control-Allow-Origin` is `*`. Tightening it to the Pages origin would break local
  testing against `python3 -m http.server` — left open deliberately; auth is by token, not origin.
- Any authenticated session can write `manpower:` (no role check). Pre-existing behaviour.
