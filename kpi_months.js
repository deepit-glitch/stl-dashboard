// STL KPI Dashboards -- Quarter / month config (SINGLE SOURCE OF TRUTH)
// Loaded by daily.html, monthly.html and entry.html via <script src="kpi_months.js?v=...">.
// This is the KPI reporting quarter (Apr/May/Jun = Q1 FY 2026-27).
// When the quarter rolls over, edit THIS FILE ONLY.
//   key   = "YYYY-MM" (used as the Worker KV month key)
//   label = full display name   short = 3-letter tab label   days = days in month
//
// IMPORTANT: the global is named STL_KPI_MONTHS, *not* MONTHS, on purpose.
// stl_data.js (loaded by daily.html) already declares a global `const MONTHS`
// for the rolling production window. A second global `var MONTHS` here would
// throw a redeclaration SyntaxError on daily.html and silently break it.
// Each dashboard aliases this to its local MONTHS: var MONTHS = window.STL_KPI_MONTHS;
var STL_KPI_MONTHS = [
  {key:"2026-04", label:"April 2026",  short:"APR", days:30},
  {key:"2026-05", label:"May 2026",    short:"MAY", days:31},
  {key:"2026-06", label:"June 2026",   short:"JUN", days:30},
];
