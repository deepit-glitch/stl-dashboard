# STL Dashboards — Claude Code Context

## What This Project Is

Two overlapping web dashboard systems for Sara Textiles Limited (Nalagarh plant), served via GitHub Pages at **dashboards.saratextiles.com** (repo: `deepit-glitch/stl-dashboard`).

1. **MIS Dashboard** (`mis_dashboard.html`) — Operations production data pulled from SAP HANA daily. Dark-themed, chart-heavy, no auth required. Data source is `stl_data.js`.

2. **KPI Dashboard** (`daily.html`, `monthly.html`) — Department-level KPI tracking entered by dept heads. React-based, role-gated via auth. Data stored in Cloudflare Worker KV.

Both share the same repo, same login flow, and the same Cloudflare Worker backend.

---

## Architecture: The Two Data Sources

### Source 1 — `stl_data.js` (MIS / production data)
- **Single source of truth** for all MIS production figures.
- Written daily by an automated bot (runs in Claude Cowork via a scheduled task).
- Pure ASCII JS constants — no JSON fetch, no API call. Dashboard reads it as a `<script>` tag.
- **Never embed data logic inside individual dashboard HTML files.** All production figures must come from this file.
- Cache-busted with `?v=YYYYMMDD` in every HTML file that loads it.

#### Key constants in `stl_data.js`:
```js
const MONTHS = ['Mar-26','Apr-26','May-26','Jun-26'];  // rolling 4-month window
const CURRENT_MONTH = 'Jun-26';   // always MONTHS[3]
const LAST_MONTH = 'May-26';      // always MONTHS[2]
const CURRENT_DAYS = 2;           // days elapsed in current month
const LAST_UPDATED = '4 Jun 2026';

const MONTHLY = { weaving:[...], dispatch:[...], loom_eff:[...], ... }
// One value per month, index aligned to MONTHS[]

const DAILY_OV = {
  'Jun-26': {
    dates:['01','02'],          // day labels, DD string
    weaving:[...], sizing:[...], warping:[...], fin1:[...],
    yarn:[...], fabwash:[...], fin:[...], stitch:[...], dispatch:[...],
    noida_fin:[...],            // Noida plant finishing (from HANA plant 1600)
    noida_manpower:[...],       // Noida headcount (from Worker API)
    mp_weaving:[...], mp_sizing:[...], mp_warping:[...],
    mp_yarn:[...], mp_fabdye:[...], mp_finishing:[...], mp_fin1:[...]
    // All 19 fields must always be same length as dates[]
  }
}

const CONSUMPTION_PARAMS = { 'Jun-26': { dates, raw, dyes_pkg, elec_pkg, petcoke_pkg } }
const DAILY     = { 'Jun-26': { dates, weaving, yd_wv, dispatch, yarn_dye, fab_dye } }
const DAILY_DH  = { 'Jun-26': { dates, yarn, fab, fin } }          // Dye House
const DAILY_DJ  = { 'Jun-26': { dates, weaving, dobby, jacquard } } // Dobby/Jacquard split
```

### Source 2 — Cloudflare Worker KV (KPI data)
- Worker URL: `https://square-flower-57b5.deepit.workers.dev`
- Department KPI entries are stored in KV, keyed by dept + month + day.
- Manpower headcounts (Nalagarh departments) stored separately under `/manpower/{date}`.
- The MIS bot also reads the Worker for `noida_manpower` and the Nalagarh `mp_` arrays.

---

## File Map

| File | Purpose |
|------|---------|
| `index.html` | Immediate redirect to `login.html` |
| `login.html` | OTP auth via Worker. On success sets `stl_token`, `stl_role`, `stl_name`, `stl_dept` in localStorage |
| `tracker_index.html` | Landing page after login — card links to all dashboards |
| `mis_dashboard.html` | MIS operations dashboard (dark theme, Chart.js, no auth guard) |
| `daily.html` | KPI daily trend charts — React, role-gated |
| `monthly.html` | KPI monthly target-vs-actual cards — React, role-gated |
| `entry.html` | Dept KPI data entry form — React + Babel, role-gated, dept-restricted |
| `manpower.html` | Nalagarh + Noida headcount entry, stored to Worker |
| `admin.html` | User management (add/edit/delete users, manage roles) |
| `discrepancy.html` | Flags mismatches between KPI entries and MIS data |
| `stl_data.js` | MIS data file — written by bot, never manually edited |
| `depts.js` | Shared `DEPTS` KPI config — single source loaded by `daily.html` + `monthly.html` |
| `kpi_months.js` | Shared **auto-generating** month list (`STL_KPI_MONTHS`, Apr 2026 → current month) + `stlKpiTarget()` — loaded by `daily.html`, `monthly.html`, `entry.html`, `manpower.html` |
| `seed.html` | Dev only — loads test KPI data into Worker KV |
| `migrate.html` | One-time data migration utility |
| `mp_recovery.html` | Recovery tool for manpower data |
| `demo_login.html` | Demo mode login (sets demo flag, bypasses Worker auth) |

---

## Auth & Role System

Auth is handled entirely by the Cloudflare Worker. No server-side session; a token is stored in `localStorage`.

**Roles:**
- `admin` — full access to all dashboards + admin panel
- `management` — read access to all KPI dashboards; no data entry
- `dept` — per-department KPI entry role (`weaving`, `dyeing`, `finishing`, `prep`, `gm_tech`, `ppc`, `bathrobe`, `quality`, `rsb`); scoped by `STL_DEPT`
- `hr` — Nalagarh manpower headcount entry → `manpower.html`
- `hr_noida` — **Noida** manpower headcount entry → `manpower.html` (renders Noida mode, plant 1600)

**Post-login routing (by role):** `login.html` sends `admin`→`admin.html`, `management`→`daily.html`, `hr`/`hr_noida`→`manpower.html`, everything else→`entry.html`.

> ⚠️ **`hr_noida` must be handled wherever `hr` is.** They are two separate roles but both go to `manpower.html`. A past bug (fixed Jun 2026) routed only `hr`, so `hr_noida` fell through to `entry.html`, where `DEPTS.find(role)` returned `undefined` and the React app crashed to a **blank white screen**. When adding any role-based branch (routing, redirects, gates), treat `hr_noida` the same as `hr` unless you specifically mean Nalagarh-only. `entry.html` now also guards against an unmapped role (shows a message instead of blanking).

**Session guard pattern** (used in `daily.html`, `monthly.html`, `entry.html`):
```js
const token = localStorage.getItem('stl_token');
if (!token) { window.location.href = 'login.html'; return; }
const res = await fetch('https://square-flower-57b5.deepit.workers.dev/auth/session',
  { headers: { 'X-Session-Token': token } });
const sd = await res.json();
window.STL_ROLE = sd.role;   // 'admin' | 'management' | 'dept'
window.STL_NAME = sd.name;
window.STL_DEPT = sd.dept;   // e.g. 'Weaving', 'Dyeing', etc.
```

**Demo mode bypass** — if `localStorage.stl_demo === 'true'` and `stl_token === 'demo'`, Worker call is skipped entirely. Used for offline testing.

---

## KPI Dashboard Architecture

Both `daily.html` and `monthly.html` are single-file React apps (no build step, React loaded from CDN unpkg). They use `React.createElement` (no JSX) except `entry.html` which uses Babel standalone for JSX.

### Department & KPI config

Both dashboards share the same `DEPTS` array definition, now extracted into **`depts.js`** (the single source of truth) and loaded via `<script src="depts.js?v=YYYYMMDD">`. `daily.html` uses it as-is; `monthly.html` filters out the manpower-only depts (`NAL_MP`/`NOI_MP`) since it has no manpower renderer. Edit KPIs/targets in `depts.js` only — never re-inline them. Each dept has:
```js
{
  id: "Weaving",
  label: "Weaving",
  accent: "#2563eb",
  kpis: [
    {
      id: "eff_jq",
      name: "Efficiency - Jacquard Looms",
      unit: "%",
      hib: true,          // higher-is-better
      freq: "daily",      // "daily" | "monthly"
      targets: { "2026-04": 60, "2026-05": 65, "2026-06": 70 }
    }, ...
  ]
}
```

Departments: `RSB` (Sr. GM Ops), `Weaving`, `Dyeing`, `Finishing`, `Bathrobe`, `Packing`, `Maintenance`, `HR`, `Stores`

> **`entry.html` keeps its own separate `DEPTS`** (not `depts.js`) — by design, for now. It is a *superset*: it carries a `desc` help-text field on every KPI plus **14 KPIs that are entry-only** (collected but not shown on any dashboard): `rsb_ls_dy`, `rsb_ls_gy`, `rsb_wstb`, `rsb_phpr`, `rsb_phyd`, `rsb_phcs`, `rsb_phbr`, `nm_grg`, `gn_cost`, `sct_beam`, `pile_yd`, `gnd_beam`, `ppp_ub`, `smp_appr`. KPI **names and targets are kept in sync** between `entry.html` and `depts.js` for shared KPI ids — if you add/rename a shared KPI or change a target, update both. (A full unification behind a `dash:` flag was considered and deferred.)

### Month config
```js
var MONTHS = [
  {key:"2026-04", label:"April 2026",  short:"APR", days:30},
  {key:"2026-05", label:"May 2026",    short:"MAY", days:31},
  {key:"2026-06", label:"June 2026",   short:"JUN", days:30},
];
```
Monitoring is **ongoing** (started as a 3-month pilot, Apr–Jun 2026). The month list lives in **`kpi_months.js`** and is **auto-generated** from `STL_KPI_START` (`2026-04`) through the current month (IST) — it self-extends each month, so **do not hand-edit the list** (hardcoding is what lapsed the dashboards at July 2026). All screens (`daily.html`, `monthly.html`, `entry.html`, `manpower.html`) alias `MONTHS = window.STL_KPI_MONTHS`.
- `key` = `"YYYY-MM"` (Worker KV key — never change the format), `label` = `"MM-YYYY"` (dropdown display), `full` = `"July 2026"`, `days` = days in month.
- **Targets** are still defined per KPI for `2026-04/05/06` only. Use `stlKpiTarget(kpi, mkey)` (not `kpi.targets[mkey]`) everywhere — it carries forward the last defined target for months past the pilot. To set new targets, add them to the KPI's `targets` in `depts.js` (and `entry.html`'s own DEPTS).
- `monthly.html` shows a **rolling 3-month window** via an "UP TO" end-month dropdown; its column colours are position-based (`MCOL_SEQ`), not keyed by month.
- Distinct from the rolling production-window `MONTHS` in `stl_data.js` (bot-managed, MIS side).

### Worker API endpoints used by dashboards
- `GET /auth/session` — validate token, get role/name/dept
- `GET /kpidata/{dept}/{month}` — fetch all KPI entries for a dept+month
- `POST /kpidata/{dept}/{month}/{day}` — save a day's KPI entries
- `GET /manpower/{date}` — single day manpower
- `GET /manpower-range?start=YYYY-MM-DD&end=YYYY-MM-DD` — month range

---

## MIS Dashboard Architecture

`mis_dashboard.html` is a plain vanilla JS file (no React, no build). It reads directly from the global constants in `stl_data.js` and renders charts using Chart.js 4.4.1 from cdnjs.

### Tabs
1. **Overview** — monthly KPI cards (weaving, dispatch, loom eff, yarn/fab dye); switchable between Last 3 Months and Current Month MTD
2. **Weaving** — daily weaving trend + dobby/jacquard split (from `DAILY_DJ`)
3. **Dye House & Dispatch** — yarn dye, fab dye, dispatch daily trends (from `DAILY_DH`, `DAILY`)
4. **Costs** — raw material, dyes/kg, electricity/kg, petcoke/kg (from `CONSUMPTION_PARAMS`)
5. **Daily Summary** — full day-wise table of all production figures
6. **Manpower Productivity** — Nalagarh dept headcounts (mp_ arrays) + Noida (noida_manpower)

### Known issues / history
- The admin section view issue (took 4 iterations to fix) was caused by the management role not being correctly scoped to hide certain admin-only KPI sections. The fix pattern: always check `window.STL_ROLE` at render time, not at load time. React state updates are async — role-gating logic that runs before the session fetch resolves will always show the wrong view.
- `DAILY_OV` must always have **exactly 19 fields in the specified order**: `dates, weaving, sizing, warping, fin1, yarn, fabwash, fin, stitch, dispatch, noida_fin, noida_manpower, mp_weaving, mp_sizing, mp_warping, mp_yarn, mp_fabdye, mp_finishing, mp_fin1`. The bot verifies this before pushing.

---

## The MIS Bot (runs in Cowork, not here)

A Claude Cowork scheduled task runs daily, parsing the SAP MIS HTML report and pushing updated `stl_data.js` to this repo. **Do not manually edit `stl_data.js`** — it will be overwritten on the next bot run.

What the bot does:
1. Reads the latest `MIS REPORT DD MMMM YY.HTM` from OneDrive
2. Parses Table 1 (monthly totals), Table 10 (daily), Table 11 (stock), Table 18 (consumption)
3. Queries SAP HANA for Noida finishing production (`ZPP_CSP_PACK`, plant 1600)
4. Fetches Nalagarh manpower from the Worker API (with browser fallback if proxy blocks)
5. Preserves existing `DAILY_DJ` dobby/jacquard values for older days (only today+yesterday are overwritten)
6. Pushes to GitHub with commit message `Auto-update: D Mon YYYY — N days`

---

## Design Principles (enforce these going forward)

1. **Single source of truth**: production/MIS data comes only from `stl_data.js`. KPI entry data comes only from the Worker. Never mix sources within a dashboard.

2. **No data logic in presentation files**: `mis_dashboard.html` and the KPI dashboards must only read and display data — no transformations or derivations that duplicate what's already computed in the data layer.

3. **Role gating at render time**: Check `window.STL_ROLE` inside the React render function or immediately before DOM manipulation — never at script load time. The session fetch is async.

4. **ASCII only in `stl_data.js`**: No ₹ symbols, no Unicode. The bot enforces this with a character check before every push.

5. **Cache-bust on every push**: Any HTML file that loads `stl_data.js` must have `?v=YYYYMMDD` updated. Currently: `mis_dashboard.html`, `daily.html`, `manpower.html`.

6. **Array length parity**: Every array inside a `DAILY_OV` month block must be the same length as `dates`. This is non-negotiable — a mismatch silently breaks every chart for that month.

7. **Pin every CDN dependency to an exact version**: never load a `<script src>` from a CDN without a version (e.g. `@babel/standalone@7.26.4`, not `@babel/standalone`). Unpinned = "latest", which auto-upgrades across breaking majors with zero repo change. In Jun 2026 `entry.html`'s unpinned `@babel/standalone` jumped to 8.0.1 and blanked the page for every department user (login + the React-only management dashboards were unaffected because only `entry.html` uses Babel). `react`/`react-dom` are pinned to `@18`. **Debugging cue:** if a page goes blank with no recent commit touching it, suspect an unpinned CDN dep before the code.

## Development Workflow

- Repo: `https://github.com/deepit-glitch/stl-dashboard`
- Deployed via GitHub Pages with custom domain `dashboards.saratextiles.com` (CNAME file in root)
- No build step — all files are static HTML/JS served directly
- Test locally by opening HTML files in browser; use `demo_login.html` to bypass auth
- Work on feature branches, not `main` directly (bot pushes go to main)
- When adding a new dashboard or view, start by defining what data it needs and whether that data already exists in `stl_data.js` or Worker KV — before writing any UI code
