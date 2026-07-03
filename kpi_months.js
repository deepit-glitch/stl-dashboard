// STL KPI Dashboards -- month config (SINGLE SOURCE OF TRUTH)
// Loaded by daily.html, monthly.html, entry.html and manpower.html via
// <script src="kpi_months.js?v=...">.
//
// Monitoring is ONGOING (started as a 3-month pilot, Apr-Jun 2026). The month
// list is AUTO-GENERATED from STL_KPI_START through the current month (IST), so
// a new month appears on its own each month -- never hand-edit the list again.
// (Hardcoding is exactly what lapsed the dashboards at July 2026.)
//
//   key   = "YYYY-MM"  -- the Worker KV month key. NEVER change this format or
//                         existing Apr-Jun data becomes unreachable.
//   label = "MM-YYYY"  -- dropdown display (e.g. 07-2026)
//   full  = "July 2026" -- long name where a full label reads better
//   days  = number of days in that month
//
// IMPORTANT: the global is named STL_KPI_MONTHS, *not* MONTHS, on purpose.
// stl_data.js (loaded by daily.html + manpower.html) declares a global
// `const MONTHS` for the rolling production window; a second global `MONTHS`
// here would throw a redeclaration SyntaxError and silently blank the page.
// Each dashboard aliases: var MONTHS = window.STL_KPI_MONTHS;

var STL_KPI_START = "2026-04"; // first month of monitoring (pilot start)

var STL_KPI_MONTHS = (function () {
  var FULL = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"];
  var sp = STL_KPI_START.split("-");
  var y = parseInt(sp[0], 10), m = parseInt(sp[1], 10);
  // current month in IST (matches the dashboards' working-date timezone)
  var ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  var ey = ist.getFullYear(), em = ist.getMonth() + 1;
  var out = [];
  while (y < ey || (y === ey && m <= em)) {
    var mm = String(m).padStart(2, "0");
    out.push({
      key:   y + "-" + mm,
      label: mm + "-" + y,
      full:  FULL[m - 1] + " " + y,
      short: mm + "-" + y,
      days:  new Date(y, m, 0).getDate()
    });
    m++; if (m > 12) { m = 1; y++; }
  }
  return out;
})();

// Target for a KPI in a given month key. If the month has no explicit target,
// carry forward the most recent target defined for an earlier month (so months
// past the pilot keep their last-set target instead of going untargeted).
// month keys are "YYYY-MM", so string comparison is chronological. Returns null
// if the KPI has no target at or before mkey.
function stlKpiTarget(kpi, mkey) {
  if (!kpi || !kpi.targets) return null;
  if (kpi.targets[mkey] !== undefined) return kpi.targets[mkey];
  var earlier = Object.keys(kpi.targets).filter(function (k) { return k <= mkey; }).sort();
  return earlier.length ? kpi.targets[earlier[earlier.length - 1]] : null;
}
window.stlKpiTarget = stlKpiTarget;
