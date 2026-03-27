// STL Operations MIS Dashboard -- Data File // Replace this file daily -- NEVER touch stl_dashboard.html for data updates // Pure ASCII numbers only -- zero encoding risk // -- ROLLING WINDOW CONFIG ---------------------------------------------------- // To update: change CURRENT_MONTH to the new month key, set CURRENT_DAYS to // days elapsed, and ensure MONTHS always = [3 months ago, 2 months ago, // last full month, current month]. Drop oldest, add new at end each month.
const MONTHS = ['Dec-25','Jan-26','Feb-26','Mar-26'];
const CURRENT_MONTH = 'Mar-26'; // always MONTHS[3]
const LAST_MONTH = 'Feb-26'; // always MONTHS[2] - last full month for KPIs
const CURRENT_DAYS = 26; // days elapsed in current month
const LAST_UPDATED = '26 Mar 2026';
// -----------------------------------------------------------------------------
const MONTHLY = {
  weaving:   [315026, 254569, 303612, 252675],
  dispatch:  [321195, 275143, 317120, 125915],
  loom_eff:  [54.92, 52.27, 53.30, 54.46],
  dobby_inst:[53.19, 50.25, 52.64, 55.00],
  jaq_inst:  [58.64, 56.88, 54.83, 52.58],
  dobby_op:  [54.65, 50.65, 53.02, 55.87],
  jaq_op:    [60.22, 57.76, 56.21, 54.01],
  dobby_prod:[180015, 179267, 225450, 206419],
  jaq_prod:  [75011, 75303, 78162, 46256],
  yarn_dye:  [114311, 136804, 93549, 81832],
  fab_dye:   [209188, 137139, 219346, 138160],
  finishing: [244371, 266862, 261529, 180620],
  stock:     [238176, 218198, 218198, 233868],
  days:      [31, 31, 28, 26]
};