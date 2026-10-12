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

`MATCODE_SERVICE_TOKEN` — lets the Mac mini job read the material-code queue and mark requests
as sent (see Material code requests). Unlike the two above it can write, so it is its own secret.

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

For local testing, a git-ignored `worker/.dev.vars` can set `SMS_BASE` to a local stub so
`wrangler dev` sends no real SMS. It must never be set on the deployed Worker.

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
- **Sara Textiles communications only.** Personal automations (LMS, DLF, meeting prep, the
  Problems and Todo List groups) and KNAB keep their own recipients locally and must never be
  added here.
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

## Material code requests

`/matcode/` — a department asks EDP to open new material codes in SAP. **The form is public: no
login.** A request only counts once the department's head (one HOD per department) approves it
with an OTP sent to the HOD's own phone. Approved requests wait in a queue for the job in
`~/stl-matcode` on the Mac mini, which checks SAP for likely duplicates (the Worker cannot reach
HANA) and emails EDP the request as Excel with the duplicates as an advisory.

| Endpoint | Who |
|---|---|
| `GET /matcode/depts` | public — departments that have a HOD, HOD name, masked number |
| `POST /matcode/requests` | public — validates, stores, sends the OTP to the HOD |
| `GET /matcode/requests/{id}` | anyone holding the id (the approval link) |
| `POST /matcode/requests/{id}/attachments?line=&name=` | same — one file per line, 4 MB, pending requests only |
| `POST /matcode/requests/{id}/resend` · `/approve` `{otp}` | same |
| `GET /matcode/queue` · `POST /matcode/requests/{id}/sent` · `GET /matcode/attachments/{id}/{line}` | `X-Service-Token` = `MATCODE_SERVICE_TOKEN` (attachments also admin) |
| `GET`/`POST /matcode/admin/config` · `GET /matcode/admin/requests?month=` | admin (`matcode/admin.html`) |

| Key | Value |
|---|---|
| `matcode:config` | `{depts:{id:{label,hod:{name,mobile}}}, email:[...]}` — HODs and the EDP address(es) |
| `mcreq:{id}` | the request; TTL 24h while `pending`, permanent once `approved` / `sent` |
| `mcatt:{id}:{line}` | attachment bytes, name/type/size in KV metadata — TTL 30 days |
| `mcq:{id}` | marker: approved, not yet emailed |
| `mcidx:{YYYY-MM}` | ids approved in a month (admin page reads one key) |
| `mcrl:{mobile}` | OTPs sent to a HOD this hour |

- **`POST /matcode/requests` is public and spends SMS money, all of it on a HOD's phone.** It is
  capped at 15 OTPs per HOD per hour across all requests (`mcrl:`), on top of `otpSend`'s
  per-request cooldown. Do not loosen this without adding another gate.
- The request id (96 random bits) is the only credential on the public endpoints. It never
  reveals the HOD's full number.
- OTPs are namespaced per request (`otp:m:{id}:{mobile}`), so two requests waiting on the same HOD
  cannot overwrite each other's OTP.
- The Worker checks a line's length and character set only. Which types, groups and units a
  department may pick lives in `matcode/depts.js`, so a new code or department needs no deploy.
- The EDP address is in `matcode:config`, not the people directory: the directory is keyed by
  mobile number and a shared mailbox has none.

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
