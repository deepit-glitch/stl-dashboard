// Worker base URL for the material code request app.
//
// On localhost ONLY, an `mc_worker` localStorage key can point the app at `wrangler dev` so the
// whole flow can be driven end-to-end without touching production data or sending real SMS.
// Served from any other host (i.e. GitHub Pages), the override is ignored outright.
(function () {
  var PROD = "https://square-flower-57b5.deepit.workers.dev";
  var isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  window.MATCODE_WORKER = (isLocal && localStorage.getItem("mc_worker")) || PROD;
})();
