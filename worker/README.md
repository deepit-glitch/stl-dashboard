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
| `inspector:{mobile}` | external inspector — `{name, company, email, firstSeen, visitCount}` |
| `visit:{id}` | one inspection visit — `{mobile, buyer, po, visitDate, status, ...}` |
| `openvisit:{mobile}` | visit id with an open survey — TTL 72h |
| `response:{visitId}` | `{ratings, comment, result, qv, submittedAt}` |
| `visitidx:{YYYY-MM}` | list of visit ids in a month (report reads one key) |

OTP keys are namespaced by flow: staff use `otp:{mobile}`, inspectors `otp:i:{mobile}` (same for
`otpat:`/`otprl:`). A number that is both a staff user and an inspector therefore cannot have one
flow clobber the other's OTP or rate-limit window.

KV is eventually consistent, so `otpat:`/`otprl:` counters are approximate. They are a
brute-force/spend deterrent, not an exact limiter.

## SMS

2Factor.in, template **`OTP1`**:
`https://2factor.in/API/V1/{key}/SMS/{mobile}/{otp}/OTP1`

## Session scopes

Sessions carry a `scope`: `"staff"` (KPI dashboards) or `"inspector"` (external survey only).

**This is load-bearing.** External inspectors are outsiders; an inspector session must never
satisfy a KPI dashboard's guard. Two independent locks:

1. `/auth/session` and every staff endpoint reject `scope:"inspector"` (`requireStaff`).
   `/survey/pending` and `/survey/submit` require it (`requireInspector`).
2. Inspectors live under `inspector:`, staff under `user:`. `/auth/send-otp` reads `user:` only,
   so an inspector's number is simply "not registered" for the KPI login.

Sessions minted before Jul 2026 have no `scope` and are treated as staff; they expire within 8h.
**When adding any endpoint, pick `requireStaff` or `requireInspector` deliberately** — a bare
`getSession` accepts both.

## Survey endpoints

| Endpoint | Who |
|---|---|
| `POST /survey/visits` · `GET /survey/visits?date=` | quality, admin (GET also management) |
| `GET /survey/inspectors?mobile=` | quality, admin — autofill a repeat visitor |
| `POST /survey/auth/send-otp` · `verify-otp` | public — **only** a registered inspector with an open visit |
| `GET /survey/pending` · `POST /survey/submit` | inspector scope only |
| `GET /survey/report/{YYYY-MM}` | quality, management, admin |

`/survey/auth/send-otp` is the only public endpoint that spends money. It refuses unless the
number is a known inspector **with an open visit** — otherwise it would be an open SMS relay.
Submitting burns the inspector's session and clears `openvisit:`, so a survey cannot be replayed.

## Notes

- `Access-Control-Allow-Origin` is `*`. Tightening it to the Pages origin would break local
  testing against `python3 -m http.server` — left open deliberately; auth is by token, not origin.
- Any authenticated session can write `manpower:` (no role check). Pre-existing behaviour.
