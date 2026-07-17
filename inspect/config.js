// Worker base URL for the inspector survey app.
//
// On localhost ONLY, an `insp_worker` localStorage key can point the app at `wrangler dev` so the
// whole flow can be driven end-to-end without touching production data or sending real SMS.
// Served from any other host (i.e. GitHub Pages), the override is ignored outright — the hostname
// check is what makes this safe to ship.
(function () {
  var PROD = "https://square-flower-57b5.deepit.workers.dev";
  var isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
  window.INSPECT_WORKER = (isLocal && localStorage.getItem("insp_worker")) || PROD;
})();
