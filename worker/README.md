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

`EMPLOYEES_READ_TOKEN` — read-only token for `GET /employees` (see Employee phone directory).

`DIRECTORY_READ_TOKEN` — read-only token for `GET /recipients` (see People directory).

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
| `employees:nalagarh` | `{updatedAt, list:{code:{name, phone, at, by}}}` — the whole phone directory in one value |
| `empbak:{ISO time}` | previous `employees:nalagarh`, written before every change — TTL 30 days |

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

## People directory

`admin.html` is one directory of people: dashboard users and the recipients of every automated
WhatsApp / email message. A record is `user:{mobile}` =
`{mobile,name,role,dept,email,active,lists,added,lastLogin,leftAt}`.

- `role` grants dashboard login; `null` means "receives messages only".
- `lists` is `{listId: ["whatsapp","email"]}`. List definitions live in one KV value, `comms:lists`.
- `active:false` ("marked as left") blocks login, ends open sessions and drops the person from
  every list in `/recipients`, while keeping the record so they can be reinstated.

| Endpoint | Who |
|---|---|
| `GET /admin/users` · `POST /admin/users` · `DELETE /admin/users/{mobile}` | admin |
| `GET /admin/lists` · `POST /admin/lists` · `DELETE /admin/lists/{id}` | admin |
| `GET /admin/log` — last 100 directory changes (`dirlog:` keys, kept one year) | admin |
| `GET /recipients` — every list resolved to its active members | admin — or `X-Service-Token` matching `DIRECTORY_READ_TOKEN` |

`POST /admin/users` is a partial update: an omitted field keeps its stored value. Automations must
read `/recipients` at send time and never carry their own copy of a number or address.

## Employee phone directory

| Endpoint | Who |
|---|---|
| `GET /employees` | hr, admin — or `X-Service-Token` matching the `EMPLOYEES_READ_TOKEN` secret |
| `POST /employees/bulk` `{upsert:[{code,name,phone}], delete:[code]}` | hr, admin |

Nalagarh only, so `hr_noida` is deliberately excluded. The service token is read-only and exists
for the absence-alert job on the Mac mini (`~/stl-absence-alerts`), which has no OTP session.
To undo a bad bulk change, copy the newest `empbak:` value back over `employees:nalagarh`.

## Notes

- `Access-Control-Allow-Origin` is `*`. Tightening it to the Pages origin would break local
  testing against `python3 -m http.server` — left open deliberately; auth is by token, not origin.
- Any authenticated session can write `manpower:` (no role check). Pre-existing behaviour.
