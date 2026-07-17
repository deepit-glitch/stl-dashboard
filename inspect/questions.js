// Inspector survey question set — SINGLE SOURCE OF TRUTH for the survey UI and the report.
//
// VERSIONING: every response is stamped with `qv` (the Worker's QUESTION_VERSION). If you reword
// a question, add one, or change what a dimension means, BUMP THE VERSION in BOTH this file and
// worker/worker.js (QUESTION_VERSION + DIMS). Do not silently reword: the report compares months,
// and a reworded question is a different question — comparing it to older answers is a lie.
//
// The Worker validates against its own DIMS list, so the `id`s here must match it exactly.
var INSPECT_QUESTIONS = {
  v: 1,
  // Two blocks with different owners: "host" is how our people handled the visit (quality/admin),
  // "goods" is what production actually made. The report keeps them apart — a bad month in one
  // says nothing about the other, and they go to different people.
  blocks: [
    {
      id: "host",
      label: "Your visit",
      hint: "How our team handled your inspection",
      dims: [
        { id: "hospitality",  label: "Hospitality",  desc: "Reception, facilities and general courtesy during your visit" },
        { id: "coordination", label: "Co-ordination", desc: "How well our team organised and supported the inspection" }
      ]
    },
    {
      id: "goods",
      label: "The goods",
      hint: "What you inspected today",
      dims: [
        { id: "ctn_stacking", label: "CTN Stacking", desc: "How cartons were stacked and presented for inspection" },
        { id: "packaging",    label: "Packaging",    desc: "Condition and quality of the packing" },
        { id: "workmanship",  label: "Workmanship",  desc: "Quality of make-up and finishing of the goods" }
      ]
    }
  ],
  scale: [
    { v: 1, label: "Very poor" },
    { v: 2, label: "Poor" },
    { v: 3, label: "Average" },
    { v: 4, label: "Good" },
    { v: 5, label: "Excellent" }
  ],
  // Ratings at or below this require a written comment. Kept in sync with LOW_RATING in the Worker,
  // which enforces it — this copy only drives the UI hint.
  lowRating: 3
};
// Flat id list in display order, for the report.
INSPECT_QUESTIONS.dims = INSPECT_QUESTIONS.blocks.reduce(function(a, b) { return a.concat(b.dims); }, []);
