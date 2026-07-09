// STL KPI Dashboards -- Department & KPI config (SINGLE SOURCE OF TRUTH)
// Loaded by both daily.html and monthly.html via <script src="depts.js?v=...">.
// Edit KPIs/targets HERE ONLY -- never re-inline this into the dashboards, or
// the two copies will drift again (the reason this file exists).
//
// Each dept: { id, label, accent, kpis:[ {id,name,unit,hib,freq,targets[,desc]} ] }
//   hib  = higher-is-better
//   freq = "daily" | "monthly"
//
// NAL_MP / NOI_MP are manpower headcount views rendered only by daily.html
// (OpsSection, from stl_data.js). monthly.html filters them out -- it has no
// manpower renderer -- so they must stay LAST in this array.
var DEPTS = [
  {id:"RSB",      label:"Sr. GM (Operations)", accent:"#4f46e5", kpis:[
    {id:"rsb_cch",   name:"CCH Efficiency",                   unit:"%",         hib:true,  freq:"daily", targets:{"2026-04":60,    "2026-05":65,    "2026-06":65}},
    {id:"rsb_agrd",  name:"A-Grade Packing %",                unit:"%",         hib:true,  freq:"daily", targets:{"2026-04":96.75, "2026-05":97,    "2026-06":97}},
    {id:"rsb_effjq", name:"Operative Efficiency - Jacquard",            unit:"%",         hib:true,  freq:"daily", targets:{"2026-04":60,    "2026-05":65,    "2026-06":70}},
    {id:"rsb_effdb", name:"Operative Efficiency - Dobby",               unit:"%",         hib:true,  freq:"daily", targets:{"2026-04":65,    "2026-05":70,    "2026-06":70}},
    {id:"rsb_ltsf",  name:"Fabric Dyeing - Lots/Day/Machine",   unit:"lots",      hib:true,  freq:"daily", targets:{"2026-04":2,     "2026-05":2,     "2026-06":2}},
    {id:"rsb_ltsy",  name:"Yarn Dyeing - Lots/Day/Machine",     unit:"lots",      hib:true,  freq:"daily", targets:{"2026-04":2,     "2026-05":2,     "2026-06":2}},
    {id:"rsb_bpf",   name:"BPF Generation",                   unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":0.75,"2026-05":0.5,  "2026-06":0.5}},
    {id:"rsb_wstt",  name:"Total Waste % - Till Finishing",   unit:"%",         hib:false, freq:"monthly", targets:{"2026-04":3.65,"2026-05":3.6,  "2026-06":3.6}},
    {id:"rsb_wip",   name:"WIP vs Dispatch - No. of Days",    unit:"Days",      hib:false, freq:"monthly", targets:{"2026-04":78,  "2026-05":76,   "2026-06":74}},
    {id:"rsb_phwv",  name:"Per Head Output - Weaving",        unit:"kg/person", hib:true,  freq:"monthly", targets:{"2026-04":150, "2026-05":160,  "2026-06":170}},
    {id:"rsb_phfd",  name:"Per Head Output - Fabric Dyeing",  unit:"kg/person", hib:true,  freq:"monthly", targets:{"2026-04":210, "2026-05":220,  "2026-06":230}},
  ]},
  {id:"Weaving",  label:"Weaving",             accent:"#2563eb", kpis:[
    {id:"eff_jq",    name:"Efficiency - Jacquard Looms",            unit:"%",         hib:true,  freq:"daily",   targets:{"2026-04":60,   "2026-05":65,   "2026-06":70}},
    {id:"eff_db",    name:"Efficiency - Dobby Looms",               unit:"%",         hib:true,  freq:"daily",   targets:{"2026-04":65,   "2026-05":70,   "2026-06":70}},
    {id:"wastage",   name:"Overall Wastage",                  unit:"%",         hib:false, freq:"daily",   targets:{"2026-04":3.65, "2026-05":3.6,  "2026-06":3.6}},
    {id:"bpf",       name:"BPF Generation",                   unit:"Tons",      hib:false, freq:"daily",   targets:{"2026-04":0,    "2026-05":0,    "2026-06":0}},
    {id:"mending",   name:"Mending % (AQL Daily Report)",                  unit:"%",         hib:false, freq:"daily",   targets:{"2026-04":5.5,  "2026-05":5.25, "2026-06":5}},
    {id:"knot_eff",  name:"Freshly Knotted Loom Efficiency",  unit:"%",         hib:true,  freq:"daily",   targets:{"2026-04":45,   "2026-05":47,   "2026-06":50}},
    {id:"hr_cost",   name:"HR Cost / kg (Wvg + Prep)",          unit:"Rs/kg",     hib:false, freq:"monthly", targets:{"2026-04":16.5, "2026-05":16,   "2026-06":15.5}},
    {id:"nm_weft",   name:"Non-Moving Weft Stock",            unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":3.5,  "2026-05":2,    "2026-06":0.5}},
  ]},
  {id:"Dyeing",   label:"Dyeing",              accent:"#0891b2", kpis:[
    {id:"rft_fab",   name:"RFT - Fabric",                     unit:"%",         hib:true,  freq:"daily",   targets:{"2026-04":98.5, "2026-05":98,   "2026-06":98,"2026-07":97,"2026-08":97,"2026-09":97}},
    {id:"rft_yrn",   name:"RFT - Yarn",                       unit:"%",         hib:true,  freq:"daily",   targets:{"2026-04":99.99,"2026-05":99.99,"2026-06":99.99,"2026-07":98,"2026-08":98,"2026-09":98}},
    {id:"dwngrade",  name:"Downgrade Due to Processing",      unit:"%",         hib:false, freq:"daily",   targets:{"2026-04":0.75, "2026-05":0.7,  "2026-06":0.6,"2026-07":0.3,"2026-08":0.3,"2026-09":0.3}},
    {id:"water",     name:"Water Consumption / kg",           unit:"ltr/kg",    hib:false, freq:"daily",   targets:{"2026-04":55,   "2026-05":54,   "2026-06":53,"2026-07":55,"2026-08":55,"2026-09":55}},
    {id:"lots_fd",   name:"Fabric Dyeing - Lots/Day/Machine", unit:"lots",      hib:true,  freq:"daily",   targets:{"2026-04":2,    "2026-05":2,    "2026-06":2,"2026-07":2,"2026-08":2.25,"2026-09":2.5}},
    {id:"lots_yd",   name:"Yarn Dyeing - Lots/Day/Machine",   unit:"lots",      hib:true,  freq:"daily",   targets:{"2026-04":2,    "2026-05":2,    "2026-06":2,"2026-07":2,"2026-08":2.25,"2026-09":2.5}},
    {id:"dye_cost",  name:"Dyes + Chemical Cost",             unit:"Rs/kg",     hib:false, freq:"monthly", targets:{"2026-04":22,   "2026-05":22,   "2026-06":22,"2026-07":22,"2026-08":22,"2026-09":22}},
    {id:"bpf_dye",   name:"BPF Generation - Dyeing",          unit:"kg",        hib:false, freq:"monthly", targets:{"2026-04":0,    "2026-05":0,    "2026-06":0,"2026-07":0,"2026-08":0,"2026-09":0}},
  ]},
  {id:"Finishing",label:"Finishing",           accent:"#7c3aed", kpis:[
    {id:"aql",       name:"Trolley AQL Failure %",            unit:"%",         hib:false, freq:"daily",   targets:{"2026-04":3,    "2026-05":2.5,  "2026-06":2,"2026-07":2,"2026-08":1.5,"2026-09":1}},
    {id:"a_grade",   name:"A-Grade Fresh Packing %",          unit:"%",         hib:true,  freq:"daily",   targets:{"2026-04":96.7, "2026-05":96.85,"2026-06":97,"2026-07":97.5,"2026-08":98,"2026-09":98}},
    {id:"insp_f",    name:"Inspection Failure / Aborted",     unit:"count",     hib:false, freq:"daily",   targets:{"2026-04":0,    "2026-05":0,    "2026-06":0,"2026-07":0,"2026-08":0,"2026-09":0}},
    {id:"cch_eff",   name:"CCH Efficiency",                   unit:"%",         hib:true,  freq:"daily",   targets:{"2026-04":60,   "2026-05":65,   "2026-06":65,"2026-07":75,"2026-08":80,"2026-09":80}},
    {id:"fin_cost",  name:"Finishing + IMS + Packing Cost",   unit:"Rs/kg",     hib:false, freq:"monthly", targets:{"2026-04":17.5, "2026-05":17.25,"2026-06":17,"2026-07":17,"2026-08":17,"2026-09":17}},
    {id:"ppp",       name:"PPP - Line Tailors",               unit:"kg/man-day",hib:true,  freq:"monthly", targets:{"2026-04":225,  "2026-05":235,  "2026-06":250,"2026-07":250,"2026-08":250,"2026-09":250}},
  ]},
  {id:"Prep",     label:"Preparatory",         accent:"#b45309", kpis:[
    {id:"hard_wst",  name:"Hard Waste",                       unit:"%",         hib:false, freq:"daily",   targets:{"2026-04":0.86, "2026-05":0.85, "2026-06":0.85,"2026-07":0.85,"2026-08":0.85,"2026-09":0.85}},
    {id:"no_beam",   name:"Looms Under No Beam / Day",        unit:"count/day", hib:false, freq:"daily",   targets:{"2026-04":3,    "2026-05":3,    "2026-06":3,"2026-07":2.5,"2026-08":2.25,"2026-09":2}},
    {id:"pile_brk",  name:"Pile Breakage",                    unit:"brks/CMPX", hib:false, freq:"daily",   targets:{"2026-04":5,    "2026-05":5,    "2026-06":5,"2026-07":4.5,"2026-08":4.25,"2026-09":4}},
    {id:"gnd_brk",   name:"Ground Breakage",                  unit:"brks/CMPX", hib:false, freq:"daily",   targets:{"2026-04":8,    "2026-05":8,    "2026-06":8,"2026-07":8,"2026-08":8,"2026-09":8}},
    {id:"pile_g",    name:"Pile Beam Length - Greighe",       unit:"Metres",    hib:true,  freq:"monthly", targets:{"2026-04":6500, "2026-05":6500, "2026-06":6500,"2026-07":6500,"2026-08":6500,"2026-09":6500}},
    {id:"creel",     name:"Creel Bottom WIP - Greighe",       unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":4,    "2026-05":3,    "2026-06":2,"2026-07":0.5,"2026-08":0.25,"2026-09":0}},
    {id:"rem_yrn",   name:"Remnant / Dead Yarn Stock",        unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":47.71,"2026-05":37.71,"2026-06":27.71,"2026-07":45,"2026-08":38,"2026-09":30}},
  ]},
  {id:"UB",       label:"GM (Tech)",           accent:"#dc2626", kpis:[
    {id:"cch_prod",  name:"CCH Production",                   unit:"Tons/day",  hib:true,  freq:"daily",   targets:{"2026-04":0.58, "2026-05":0.60, "2026-06":0.65}},
    {id:"repair",    name:"Repair Percentage",                unit:"%",         hib:false, freq:"daily",   targets:{"2026-04":0.75, "2026-05":0.75, "2026-06":0.70}},
    {id:"lots_fd2",  name:"Fabric Dyeing - Lots/Day/Machine", unit:"lots",      hib:true,  freq:"daily",   targets:{"2026-04":2,    "2026-05":2,    "2026-06":2}},
    {id:"lots_yd2",  name:"Yarn Dyeing - Lots/Day/Machine",   unit:"lots",      hib:true,  freq:"daily",   targets:{"2026-04":1.9,  "2026-05":2,    "2026-06":2}},
    {id:"steam_c",   name:"Steam Cost / kg (to Finishing)",                  unit:"Rs/kg",     hib:false, freq:"monthly", targets:{"2026-04":24,   "2026-05":23,   "2026-06":22}},
    {id:"pwr_c",     name:"Power Cost / kg of Dispatch",      unit:"Rs/kg",     hib:false, freq:"monthly", targets:{"2026-04":26,   "2026-05":25,   "2026-06":24}},
    {id:"wip_ub",    name:"WIP - Tons (RM + FG)",             unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":945,  "2026-05":920,  "2026-06":895}},
  ]},
  {id:"PPC",      label:"PPC",                 accent:"#0f766e", kpis:[
    {id:"wip_t",     name:"WIP - Tons (RM + FG)",             unit:"Tons",      hib:false, freq:"monthly", desc:"Total inventory in tons (RM + FG combined). Entered last day of month.", targets:{"2026-04":945,"2026-05":920,"2026-06":895,"2026-07":870,"2026-08":860,"2026-09":850}},
    {id:"wip_days",  name:"WIP - No. of Days",                unit:"Days",      hib:false, freq:"monthly", targets:{"2026-04":78,   "2026-05":76,   "2026-06":74,"2026-07":75,"2026-08":70,"2026-09":66}},
    {id:"nm_br",     name:"Non-Moving - Bathrobe",            unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":11,   "2026-05":8,    "2026-06":5,"2026-07":3,"2026-08":3,"2026-09":3}},
    {id:"nm_fg",     name:"Non-Moving - Finished Goods",      unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":30,   "2026-05":20,   "2026-06":10,"2026-07":2,"2026-08":2,"2026-09":2}},
    {id:"nm_gr",     name:"Non-Moving - Greigh Fabric",       unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":10,   "2026-05":8,    "2026-06":6,"2026-07":6,"2026-08":6,"2026-09":6}},
    {id:"nm_tot",    name:"Total Non-Moving Stock",           unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":51,   "2026-05":36,   "2026-06":21,"2026-07":35,"2026-08":30,"2026-09":25}},
    {id:"rem_ppc",   name:"Remnant / Dead Yarn Stock",        unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":47.71,"2026-05":37.71,"2026-06":27.71,"2026-07":45,"2026-08":38,"2026-09":30}},
    {id:"insp_abort",name:"Inspections Aborted",              unit:"No.",       hib:false, freq:"monthly", desc:"Number of inspection batches aborted during the month. Target is zero.", targets:{"2026-04":0,"2026-05":0,"2026-06":0,"2026-07":0,"2026-08":0,"2026-09":0}},
  ]},
  {id:"Bathrobe", label:"Bathrobe",            accent:"#9f1239", kpis:[
    {id:"wst_br",    name:"Wastage % - Bathrobe + Madeups",   unit:"%",         hib:false, freq:"monthly", targets:{"2026-04":10,   "2026-05":9,    "2026-06":8}},
    {id:"wst_jsy",   name:"Wastage % - Jersey",               unit:"%",         hib:false, freq:"monthly", desc:"Monthly material wastage % in jersey bathrobe manufacturing. Lower is better.", targets:{"2026-04":10,"2026-05":10,"2026-06":10}},
    {id:"nm_wip",    name:"Non-Moving WIP (Finishing Floor 1)",         unit:"Tons",      hib:false, freq:"monthly", targets:{"2026-04":13.3, "2026-05":10.8, "2026-06":7.8}},
  ]},
  {id:"Quality",  label:"Quality",             accent:"#059669", kpis:[
    {id:"insp_fail", name:"Overall Inspection Failure",       unit:"count",     hib:false, freq:"daily",   targets:{"2026-04":0,    "2026-05":0,    "2026-06":0}},
    {id:"wrng_prod", name:"Wrong Production Before HOD Info", unit:"kg",        hib:false, freq:"daily",   targets:{"2026-04":300,  "2026-05":300,  "2026-06":300}},
    {id:"cust_cmp",  name:"Customer Complaints (SMD Approved)",              unit:"count",     hib:false, freq:"monthly", targets:{"2026-04":0,    "2026-05":0,    "2026-06":0}},
    {id:"insp_scr",  name:"Inspector Feedback Score",         unit:"Score 1-5", hib:true,  freq:"monthly", targets:{"2026-04":4,    "2026-05":4.25, "2026-06":4.5}},
  ]},
  // ── Manpower headcount views — daily.html only (monthly.html filters these out) ──
  {id:"NAL_MP", label:"Nalagarh", accent:"#4f46e5", kpis:[]},
  {id:"NOI_MP", label:"Noida",    accent:"#dc2626", kpis:[]},
];
