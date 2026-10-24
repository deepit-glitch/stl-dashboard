const OTP_TTL = 600;
const SESS_TTL = 28800;
const INSP_SESS_TTL = 7200;
const VISIT_TTL = 259200;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SEC = 25;
const OTP_MAX_PER_HOUR = 10;
const QUESTION_VERSION = 1;
const DIMS = ["hospitality","coordination","ctn_stacking","packaging","workmanship"];
const LOW_RATING = 3;
const EMP_KEY = "employees:nalagarh";
const EMP_ROLES = ["hr","admin"];
const EMP_MAX_BATCH = 5000;
const EMP_BACKUP_TTL = 2592000;
const EMP_OPTIONAL = ["dept","email","doj","dob"];
// Department names exactly as Savior TOS spells them, so a record lines up with the attendance report.
const EMP_DEPTS = ["ADMINISTRATION","BATHROBE","CARTOON PACKING","COMMERCIAL","DESIGNING","ENGINEERING","FABRIC DYEING",
  "FINISHING","GODOWN","GREIGH FOLDING","HUMAN RESOURCE","I.M.S","INFORMATION TECHNOLOGY","KNITTING","LAB","MACHINE LINE",
  "MARKETTING","NEW PRODUCT DEVELOPMENT QI","OPERATION","PREPARATORY","PREPARATORY MAINTINENCE","PRODUCTION PLANNING CONTROL",
  "QUALITY ASSURANCE","STORE","WEAVING","WEAVING MAINTAINANCE","WINDING","YARN DYEING"];
const CORS = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS","Access-Control-Allow-Headers":"Content-Type,X-Session-Token"};
const ROLE_DEPT = {weaving:"Weaving",dyeing:"Dyeing",finishing:"Finishing",prep:"Prep",gm_tech:"UB",ppc:"PPC",bathrobe:"Bathrobe",quality:"Quality",rsb:"RSB",hr:"HR",hr_noida:"Noida Finishing"};
const DIR_LISTS_KEY = "comms:lists";
const DIR_CHANNELS = ["whatsapp","email"];
const DIR_LOG_TTL = 31536000;
const MC_CFG_KEY = "matcode:config";
const MC_PENDING_TTL = 86400;
const MC_ATT_TTL = 2592000;
const MC_ATT_MAX = 4194304;
const MC_ATT_TYPES = ["application/pdf","image/jpeg","image/png","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];
const MC_MAX_LINES = 25;
const MC_HOD_MAX_PER_HOUR = 15;
// One line of a request. Mirrors the columns of the department's Excel format; the lengths are SAP's.
const MC_FIELDS = [{k:"description",label:"Material description",max:40,req:true},{k:"mtart",label:"Material type",max:4,req:true,re:/^[A-Z0-9]+$/},{k:"matkl",label:"Material group",max:9,req:true,re:/^[A-Z0-9]+$/},{k:"uom",label:"UOM",max:3,req:true,re:/^[A-Z0-9]+$/},{k:"plant",label:"Plant",max:4,req:true,re:/^\d{4}$/},{k:"manufacturer",label:"Manufacturer",max:60},{k:"mfrpn",label:"Manufacturer part no.",max:40},{k:"equipment",label:"Equipment / functional location",max:60},{k:"remarks",label:"Remarks",max:200}];
const LOGIN_ROLES = ["admin","management"].concat(Object.keys(ROLE_DEPT));
function json(data, status=200){return new Response(JSON.stringify(data),{status,headers:{"Content-Type":"application/json",...CORS}});}
function rand6(){const a=new Uint32Array(1);crypto.getRandomValues(a);return String(100000+(a[0]%900000));}
function randToken(){const arr=new Uint8Array(32);crypto.getRandomValues(arr);return Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");}
function randId(){const arr=new Uint8Array(12);crypto.getRandomValues(arr);return Array.from(arr).map(b=>b.toString(16).padStart(2,"0")).join("");}
// IST is UTC+5:30 and never shifts; the dashboards treat the IST calendar day as the day.
function empCode(v){const c=String(v==null?"":v).trim().toUpperCase();return /^[A-Z0-9]{1,12}$/.test(c)?c:"";}
function istDate(){return new Date(Date.now()+19800000).toISOString().slice(0,10);}
// SMS_BASE is unset in production; `wrangler dev` points it at a local stub so no real SMS is sent.
async function sendOTP(mobile,otp,env){try{const url=(env.SMS_BASE||"https://2factor.in")+"/API/V1/"+env.TWOFACTOR_KEY+"/SMS/"+mobile+"/"+otp+"/OTP1";const resp=await fetch(url);const data=await resp.json();return data.Status==="Success";}catch(e){return false;}}
// Shared OTP machinery. `p` namespaces the KV keys so a number that is both a staff user and an
// external inspector cannot have one flow clobber the other's OTP or rate-limit window.
async function otpSend(mobile,env,p){const now=Date.now();const rlRaw=await env.AUTH_KV.get("otprl:"+p+mobile);let rl=rlRaw?JSON.parse(rlRaw):{n:0,first:now,last:0};if(now-rl.first>3600000)rl={n:0,first:now,last:0};if(rl.last&&now-rl.last<OTP_COOLDOWN_SEC*1000)return{ok:false,status:429,error:"Please wait a few seconds before requesting another OTP."};if(rl.n>=OTP_MAX_PER_HOUR)return{ok:false,status:429,error:"Too many OTP requests. Please try again later."};const otp=rand6();await env.AUTH_KV.put("otp:"+p+mobile,otp,{expirationTtl:OTP_TTL});await env.AUTH_KV.delete("otpat:"+p+mobile);const sent=await sendOTP(mobile,otp,env);if(!sent)return{ok:false,status:500,error:"SMS failed - please retry"};rl.n++;rl.last=now;await env.AUTH_KV.put("otprl:"+p+mobile,JSON.stringify(rl),{expirationTtl:3600});return{ok:true};}
async function otpVerify(mobile,otp,env,p){const atRaw=await env.AUTH_KV.get("otpat:"+p+mobile);const at=atRaw?parseInt(atRaw,10):0;if(at>=OTP_MAX_ATTEMPTS){await env.AUTH_KV.delete("otp:"+p+mobile);return{ok:false,status:429,error:"Too many incorrect attempts. Please request a new OTP."};}const stored=await env.AUTH_KV.get("otp:"+p+mobile);if(!stored||stored!==otp){await env.AUTH_KV.put("otpat:"+p+mobile,String(at+1),{expirationTtl:OTP_TTL});return{ok:false,status:401,error:"Incorrect or expired OTP"};}await env.AUTH_KV.delete("otp:"+p+mobile);await env.AUTH_KV.delete("otpat:"+p+mobile);return{ok:true};}
// A directory record with no role is a message recipient only; one marked inactive has left.
function canLogin(u){return !!u&&u.active!==false&&!!u.role;}
async function dirLists(env){const raw=await env.AUTH_KV.get(DIR_LISTS_KEY);return raw?JSON.parse(raw):{};}
async function dirUsers(env){const out=[];let cursor;do{const page=await env.AUTH_KV.list({prefix:"user:",cursor});const got=await Promise.all(page.keys.map(async k=>{const raw=await env.AUTH_KV.get(k.name);return raw?JSON.parse(raw):null;}));out.push(...got.filter(Boolean));cursor=page.list_complete?null:page.cursor;}while(cursor);return out;}
async function dirLog(env,sess,action,detail){await env.AUTH_KV.put("dirlog:"+new Date().toISOString()+":"+randId().slice(0,6),JSON.stringify({at:new Date().toISOString(),by:sess.name||sess.mobile,action,...detail}),{expirationTtl:DIR_LOG_TTL});}
// Sessions are keyed by token, so ending a person's access means scanning them. There are only ever a few dozen.
async function killSessions(env,mobile){let cursor;do{const page=await env.AUTH_KV.list({prefix:"sess:",cursor});await Promise.all(page.keys.map(async k=>{const raw=await env.AUTH_KV.get(k.name);if(!raw)return;const s=JSON.parse(raw);if(s.mobile===mobile&&s.scope!=="inspector")await env.AUTH_KV.delete(k.name);}));cursor=page.list_complete?null:page.cursor;}while(cursor);}
async function getSession(request,env){const token=request.headers.get("X-Session-Token")||new URL(request.url).searchParams.get("token");if(!token)return null;const raw=await env.AUTH_KV.get("sess:"+token);if(!raw)return null;const s=JSON.parse(raw);s._token=token;return s;}
// Sessions minted before Jul 2026 carry no scope; they are staff sessions and expire within 8h.
function isInspector(sess){return !!sess&&sess.scope==="inspector";}
async function requireStaff(request,env,roles){const s=await getSession(request,env);if(!s||isInspector(s))return null;if(roles&&roles.indexOf(s.role)===-1)return null;return s;}
async function requireInspector(request,env){const s=await getSession(request,env);if(!s||!isInspector(s))return null;return s;}
async function requireAdmin(request,env){return await requireStaff(request,env,["admin"]);}
async function mcConfig(env){const raw=await env.AUTH_KV.get(MC_CFG_KEY);const c=raw?JSON.parse(raw):{};return{depts:c.depts||{},email:c.email||[]};}
function mcMask(mobile){return "XXXXXX"+String(mobile).slice(-4);}
function mcText(v){return String(v==null?"":v).replace(/\s+/g," ").trim();}
function mcService(request,env){const t=request.headers.get("X-Service-Token");return !!(t&&env.MATCODE_SERVICE_TOKEN&&t===env.MATCODE_SERVICE_TOKEN);}
// The form is public, so every OTP it triggers lands on a head of department's phone. Cap them per
// HOD across all requests; the per-request limits in otpSend alone would let a stranger open
// request after request.
async function mcHodLimit(env,mobile){const now=Date.now();const raw=await env.AUTH_KV.get("mcrl:"+mobile);let rl=raw?JSON.parse(raw):{n:0,first:now};if(now-rl.first>3600000)rl={n:0,first:now};if(rl.n>=MC_HOD_MAX_PER_HOUR)return false;rl.n++;await env.AUTH_KV.put("mcrl:"+mobile,JSON.stringify(rl),{expirationTtl:3600});return true;}
async function mcAttachments(env,id){const page=await env.AUTH_KV.list({prefix:"mcatt:"+id+":"});return page.keys.map(k=>({line:parseInt(k.name.split(":")[2],10),...(k.metadata||{})})).sort((a,b)=>a.line-b.line);}
// What anyone holding the request link may see: everything except the HOD's full number.
async function mcView(env,r){return{id:r.id,no:r.no,dept:r.dept,deptLabel:r.deptLabel,requester:r.requester,requesterMobile:r.requesterMobile||null,lines:r.lines,status:r.status,createdAt:r.createdAt,approvedAt:r.approvedAt||null,sentAt:r.sentAt||null,dupes:r.dupes||null,note:r.note||null,hod:{name:r.hod.name,mobile:mcMask(r.hod.mobile)},attachments:await mcAttachments(env,r.id)};}
export default{async fetch(request,env){
const url=new URL(request.url);const path=url.pathname;
if(request.method==="OPTIONS")return new Response(null,{headers:CORS});
if(path==="/auth/send-otp"&&request.method==="POST"){const{mobile}=await request.json();if(!mobile||!/^[6-9]\d{9}$/.test(mobile))return json({ok:false,error:"Invalid mobile number"},400);const userRaw=await env.AUTH_KV.get("user:"+mobile);if(!userRaw||!canLogin(JSON.parse(userRaw)))return json({ok:false,error:"Number not registered. Contact admin."},403);const r=await otpSend(mobile,env,"");return r.ok?json({ok:true}):json({ok:false,error:r.error},r.status);}
if(path==="/auth/verify-otp"&&request.method==="POST"){const{mobile,otp}=await request.json();if(!mobile||!otp)return json({ok:false,error:"Missing fields"},400);const v=await otpVerify(mobile,otp,env,"");if(!v.ok)return json({ok:false,error:v.error},v.status);const userRaw=await env.AUTH_KV.get("user:"+mobile);if(!userRaw)return json({ok:false,error:"Number not registered. Contact admin."},403);const user=JSON.parse(userRaw);if(!canLogin(user))return json({ok:false,error:"Number not registered. Contact admin."},403);const token=randToken();const sess={mobile,role:user.role,name:user.name,dept:user.dept||null,scope:"staff",created:Date.now()};await env.AUTH_KV.put("sess:"+token,JSON.stringify(sess),{expirationTtl:SESS_TTL});user.lastLogin=new Date().toISOString();await env.AUTH_KV.put("user:"+mobile,JSON.stringify(user));return json({ok:true,token,role:user.role,name:user.name,dept:user.dept||null});}
// An inspector session must never satisfy a KPI dashboard's session guard.
if(path==="/auth/session"&&request.method==="GET"){const sess=await getSession(request,env);if(!sess||isInspector(sess))return json({ok:false,error:"Invalid or expired session"},401);return json({ok:true,role:sess.role,name:sess.name,dept:sess.dept,mobile:sess.mobile});}
if(path==="/auth/logout"&&request.method==="POST"){const token=request.headers.get("X-Session-Token");if(token)await env.AUTH_KV.delete("sess:"+token);return json({ok:true});}
if(path.startsWith("/kpidata/")&&request.method==="GET"){const sess=await requireStaff(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);const parts=path.split("/");const dept=decodeURIComponent(parts[2]);const mk=decodeURIComponent(parts[3]);const raw=await env.AUTH_KV.get("kpidata:"+dept+":"+mk);return json({ok:true,data:raw?JSON.parse(raw):{}});}
if(path.startsWith("/kpidata/")&&request.method==="POST"){const sess=await requireStaff(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);const parts=path.split("/");const dept=decodeURIComponent(parts[2]);const mk=decodeURIComponent(parts[3]);const sessDept=sess.dept||ROLE_DEPT[sess.role]||null;if(sess.role!=="admin"&&sessDept!==dept)return json({ok:false,error:"Forbidden"},403);const{data}=await request.json();await env.AUTH_KV.put("kpidata:"+dept+":"+mk,JSON.stringify(data));return json({ok:true});}
/* ---------- People directory: dashboard users + message recipients ---------- */

// One record per person (`user:{mobile}`). `role` grants dashboard login; `lists` says which
// automated WhatsApp / email lists they receive. Marking someone inactive ends both at once.
if(path==="/admin/users"&&request.method==="GET"){if(!await requireAdmin(request,env))return json({ok:false,error:"Unauthorized"},401);return json({ok:true,users:await dirUsers(env)});}
if(path==="/admin/users"&&request.method==="POST"){
  const sess=await requireAdmin(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);
  const b=await request.json();const mobile=String(b.mobile||"");
  if(!/^[6-9]\d{9}$/.test(mobile))return json({ok:false,error:"Invalid mobile number"},400);
  const curRaw=await env.AUTH_KV.get("user:"+mobile);const cur=curRaw?JSON.parse(curRaw):null;
  // A caller may send only the fields it is changing; anything omitted keeps its stored value.
  const pick=(k,d)=>b[k]!==undefined?b[k]:(cur&&cur[k]!==undefined?cur[k]:d);
  const name=String(pick("name","")||"").replace(/\s+/g," ").trim();
  if(!name||name.length>80)return json({ok:false,error:"Name is missing or too long"},400);
  const role=pick("role",null)||null;
  if(role&&LOGIN_ROLES.indexOf(role)===-1)return json({ok:false,error:"Unknown role"},400);
  const email=String(pick("email","")||"").trim().toLowerCase();
  if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({ok:false,error:"Invalid email address"},400);
  const active=pick("active",true)!==false;
  if(mobile===sess.mobile&&(!active||role!=="admin"))return json({ok:false,error:"You cannot remove your own admin access."},400);
  const defs=await dirLists(env);const wanted=pick("lists",{})||{};const lists={};
  for(const id of Object.keys(wanted)){
    if(!defs[id])return json({ok:false,error:"Unknown list: "+id},400);
    const ch=DIR_CHANNELS.filter(c=>[].concat(wanted[id]).indexOf(c)!==-1);
    if(ch.indexOf("email")!==-1&&!email)return json({ok:false,error:"Add an email address before putting "+name+" on an email list."},400);
    if(ch.length)lists[id]=ch;}
  const dept=role?(b.dept!==undefined?(b.dept||null):(cur&&cur.role===role?(cur.dept||null):(ROLE_DEPT[role]||null))):null;
  const now=new Date().toISOString();
  const user={mobile,name,role,dept,email:email||null,active,lists,added:cur?cur.added:now,lastLogin:cur?cur.lastLogin:null,leftAt:active?null:((cur&&cur.leftAt)||now)};
  await env.AUTH_KV.put("user:"+mobile,JSON.stringify(user));
  if(!canLogin(user))await killSessions(env,mobile);
  await dirLog(env,sess,cur?"update":"add",{mobile,name,role,active,lists:Object.keys(lists)});
  return json({ok:true,user});}
if(path.startsWith("/admin/users/")&&request.method==="DELETE"){
  const sess=await requireAdmin(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);
  const mobile=path.split("/").pop();
  if(mobile===sess.mobile)return json({ok:false,error:"You cannot remove your own admin access."},400);
  const curRaw=await env.AUTH_KV.get("user:"+mobile);
  await env.AUTH_KV.delete("user:"+mobile);await killSessions(env,mobile);
  if(curRaw)await dirLog(env,sess,"delete",{mobile,name:JSON.parse(curRaw).name});
  return json({ok:true});}

// Distribution lists, for Sara Textiles communications only: personal and other-company
// automations keep their own recipients and never use this directory.
// A list is only a label here; membership lives on each person's record.
// `group` is an optional WhatsApp group id that also receives the list's messages.
if(path==="/admin/lists"&&request.method==="GET"){if(!await requireAdmin(request,env))return json({ok:false,error:"Unauthorized"},401);return json({ok:true,lists:await dirLists(env)});}
if(path==="/admin/lists"&&request.method==="POST"){
  const sess=await requireAdmin(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);
  const b=await request.json();const id=String(b.id||"").trim().toLowerCase();
  if(!/^[a-z0-9][a-z0-9-]{1,39}$/.test(id))return json({ok:false,error:"List id must be 2-40 characters: lowercase letters, digits and hyphens."},400);
  const name=String(b.name||"").replace(/\s+/g," ").trim();if(!name||name.length>80)return json({ok:false,error:"List name is missing or too long"},400);
  const group=String(b.group||"").trim();if(group&&!/^[0-9-]+@g\.us$/.test(group))return json({ok:false,error:"WhatsApp group id must look like 1203…@g.us"},400);
  const defs=await dirLists(env);const isNew=!defs[id];
  defs[id]={name,group:group||null,note:String(b.note||"").trim().slice(0,200)};
  await env.AUTH_KV.put(DIR_LISTS_KEY,JSON.stringify(defs));
  await dirLog(env,sess,isNew?"list-add":"list-update",{list:id,name});
  return json({ok:true,lists:defs});}
if(path.startsWith("/admin/lists/")&&request.method==="DELETE"){
  const sess=await requireAdmin(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);
  const id=decodeURIComponent(path.split("/").pop());const defs=await dirLists(env);
  if(!defs[id])return json({ok:false,error:"No such list"},404);
  const members=(await dirUsers(env)).filter(u=>u.lists&&u.lists[id]).length;
  if(members)return json({ok:false,error:"Remove its "+members+" member(s) first."},400);
  delete defs[id];await env.AUTH_KV.put(DIR_LISTS_KEY,JSON.stringify(defs));
  await dirLog(env,sess,"list-delete",{list:id});
  return json({ok:true,lists:defs});}
if(path==="/admin/log"&&request.method==="GET"){
  if(!await requireAdmin(request,env))return json({ok:false,error:"Unauthorized"},401);
  const keys=[];let cursor;do{const page=await env.AUTH_KV.list({prefix:"dirlog:",cursor});keys.push(...page.keys.map(k=>k.name));cursor=page.list_complete?null:page.cursor;}while(cursor);
  const rows=await Promise.all(keys.slice(-100).reverse().map(async k=>{const raw=await env.AUTH_KV.get(k);return raw?JSON.parse(raw):null;}));
  return json({ok:true,log:rows.filter(Boolean)});}
// What every automation reads before it sends: each list resolved to its current, active members.
// Automations have no OTP session, so they present a read-only service token instead.
if(path==="/recipients"&&request.method==="GET"){
  const svc=request.headers.get("X-Service-Token");
  const allowed=(svc&&env.DIRECTORY_READ_TOKEN&&svc===env.DIRECTORY_READ_TOKEN)||await requireAdmin(request,env);
  if(!allowed)return json({ok:false,error:"Unauthorized"},401);
  const defs=await dirLists(env);const users=(await dirUsers(env)).filter(u=>u.active!==false).sort((a,b)=>a.name<b.name?-1:1);const out={};
  for(const id of Object.keys(defs)){const d=defs[id];
    const on=c=>users.filter(u=>u.lists&&u.lists[id]&&u.lists[id].indexOf(c)!==-1);
    out[id]={name:d.name,group:d.group||null,
      whatsapp:on("whatsapp").map(u=>({name:u.name,to:"91"+u.mobile})),
      email:on("email").filter(u=>u.email).map(u=>({name:u.name,to:u.email}))};}
  return json({ok:true,generatedAt:new Date().toISOString(),lists:out});}
if(path.startsWith("/manpower/")&&request.method==="GET"){const sess=await requireStaff(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);const date=path.split("/")[2];const raw=await env.AUTH_KV.get("manpower:"+date);return json({ok:true,data:raw?JSON.parse(raw):null});}
if(path.startsWith("/manpower/")&&request.method==="POST"){const sess=await requireStaff(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);const date=path.split("/")[2];const data=await request.json();await env.AUTH_KV.put("manpower:"+date,JSON.stringify({...data,enteredBy:sess.mobile,enteredAt:new Date().toISOString()}));return json({ok:true});}if(path==="/manpower-range"&&request.method==="GET"){const s=url.searchParams.get("start");const e=url.searchParams.get("end");if(!s||!e)return json({ok:false,error:"Missing params"},400);const keys=[];let d=new Date(s+"T00:00:00Z");const ed=new Date(e+"T00:00:00Z");while(d<=ed&&keys.length<35){keys.push(d.toISOString().slice(0,10));d.setUTCDate(d.getUTCDate()+1);}const entries=await Promise.all(keys.map(async k=>{const raw=await env.AUTH_KV.get("manpower:"+k);return{date:k,data:raw?JSON.parse(raw):null};}));return json({ok:true,data:entries});}

/* ---------- Employee phone directory (Nalagarh) ---------- */

// The whole directory (~1,000 rows) is one KV value, so the HR page and the absence-alert job each
// read it in a single get. Writes are last-write-wins on that value: fine for one or two HR users.
if(path==="/employees"&&request.method==="GET"){
  // The absence-alert job on the Mac mini has no OTP session; it reads with a service token instead.
  const svc=request.headers.get("X-Service-Token");
  const allowed=(svc&&env.EMPLOYEES_READ_TOKEN&&svc===env.EMPLOYEES_READ_TOKEN)||await requireStaff(request,env,EMP_ROLES);
  if(!allowed)return json({ok:false,error:"Unauthorized"},401);
  const raw=await env.AUTH_KV.get(EMP_KEY);const dir=raw?JSON.parse(raw):{updatedAt:null,list:{}};
  return json({ok:true,updatedAt:dir.updatedAt,departments:EMP_DEPTS,employees:Object.keys(dir.list).sort().map(c=>({code:c,...dir.list[c]}))});}
// Add, modify and delete in one call. Any invalid row rejects the whole batch, so a half-applied upload cannot happen.
if(path==="/employees/bulk"&&request.method==="POST"){
  const sess=await requireStaff(request,env,EMP_ROLES);if(!sess)return json({ok:false,error:"Unauthorized"},401);
  const b=await request.json();const upsert=Array.isArray(b.upsert)?b.upsert:[];const del=Array.isArray(b.delete)?b.delete:[];
  if(!upsert.length&&!del.length)return json({ok:false,error:"Nothing to save."},400);
  if(upsert.length+del.length>EMP_MAX_BATCH)return json({ok:false,error:"Too many rows in one request."},400);
  // name and phone are required for a new employee; every other field, and name/phone on an existing one,
  // is only changed when the row carries it ("" clears an optional field). So a sheet of code + department
  // fills in departments without touching anyone's phone.
  const raw=await env.AUTH_KV.get(EMP_KEY);const dir=raw?JSON.parse(raw):{updatedAt:null,list:{}};
  const errors=[];const rows=[];const seen={};const today=istDate();
  upsert.forEach((r,i)=>{r=r||{};const code=empCode(r.code);const has=k=>r[k]!==undefined&&r[k]!==null;const str=k=>String(r[k]).replace(/\s+/g," ").trim();
    const err=e=>errors.push({row:i+1,code:code||undefined,error:e});
    if(!code)return err("Invalid employee code");
    if(seen[code])return err("Employee code appears twice");
    const cur=dir.list[code];const f={};
    if(has("name")||!cur){const v=has("name")?str("name"):"";if(!v||v.length>80)return err("Name is missing or too long");f.name=v;}
    if(has("phone")||!cur){const v=has("phone")?str("phone"):"";if(!/^[6-9]\d{9}$/.test(v))return err("Phone must be a 10-digit mobile number");f.phone=v;}
    if(has("dept")){const v=str("dept").toUpperCase();if(v&&EMP_DEPTS.indexOf(v)===-1)return err("Unknown department: "+v);f.dept=v;}
    if(has("email")){const v=str("email").toLowerCase();if(v&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))return err("Invalid email address");f.email=v;}
    for(const k of ["doj","dob"]){if(!has(k))continue;const v=str(k);
      if(v&&!(/^\d{4}-\d{2}-\d{2}$/.test(v)&&!isNaN(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v))return err((k==="doj"?"Date of joining":"Date of birth")+" must be a real date");
      if(v&&(v>today||v<"1940-01-01"))return err((k==="doj"?"Date of joining":"Date of birth")+" is out of range");f[k]=v;}
    const dob=f.dob!==undefined?f.dob:cur&&cur.dob;const doj=f.doj!==undefined?f.doj:cur&&cur.doj;
    if(dob&&doj&&dob>=doj)return err("Date of birth must be before the date of joining");
    seen[code]=true;rows.push({code,f});});
  const delCodes=del.map(empCode);if(delCodes.some(c=>!c))errors.push({error:"Invalid employee code in delete list"});
  if(errors.length)return json({ok:false,error:"Some rows are invalid. Nothing was saved.",errors:errors.slice(0,50)},400);
  const now=new Date().toISOString();
  // Keep the previous version for 30 days: a mistaken bulk delete is otherwise unrecoverable.
  if(raw)await env.AUTH_KV.put("empbak:"+now,raw,{expirationTtl:EMP_BACKUP_TTL});
  const out={added:0,updated:0,unchanged:0,deleted:0,notFound:0};
  for(const c of delCodes){if(dir.list[c]){delete dir.list[c];out.deleted++;}else out.notFound++;}
  for(const r of rows){const cur=dir.list[r.code];
    if(cur&&Object.keys(r.f).every(k=>(cur[k]||"")===r.f[k])){out.unchanged++;continue;}
    if(cur)out.updated++;else out.added++;
    const rec={...(cur||{}),...r.f,at:now,by:sess.name||sess.mobile};
    for(const k of EMP_OPTIONAL)if(!rec[k])delete rec[k];
    dir.list[r.code]=rec;}
  dir.updatedAt=now;await env.AUTH_KV.put(EMP_KEY,JSON.stringify(dir));
  return json({ok:true,...out,total:Object.keys(dir.list).length});}

/* ---------- Inspector survey ---------- */

// Staff: look up a known inspector so a repeat visit needs no retyping.
if(path==="/survey/inspectors"&&request.method==="GET"){if(!await requireStaff(request,env,["quality","admin"]))return json({ok:false,error:"Unauthorized"},401);const mobile=url.searchParams.get("mobile")||"";if(!/^[6-9]\d{9}$/.test(mobile))return json({ok:false,error:"Invalid mobile number"},400);const raw=await env.AUTH_KV.get("inspector:"+mobile);const openRaw=await env.AUTH_KV.get("openvisit:"+mobile);return json({ok:true,inspector:raw?JSON.parse(raw):null,hasOpenVisit:!!openRaw});}
// Staff: register a visit. Creates the inspector on first sight, then opens a 72h survey window.
if(path==="/survey/visits"&&request.method==="POST"){const sess=await requireStaff(request,env,["quality","admin"]);if(!sess)return json({ok:false,error:"Unauthorized"},401);const b=await request.json();const mobile=String(b.mobile||"").replace(/\D/g,"");if(!/^[6-9]\d{9}$/.test(mobile))return json({ok:false,error:"Invalid mobile number"},400);const name=String(b.name||"").trim();const company=String(b.company||"").trim();const buyer=String(b.buyer||"").trim();if(!name||!company||!buyer)return json({ok:false,error:"Name, company and buyer are required"},400);
  // An inspector must never have two open visits at once, or a survey could not be tied to one.
  const openRaw=await env.AUTH_KV.get("openvisit:"+mobile);if(openRaw)return json({ok:false,error:"A survey is already open for this inspector. It expires 72h after registration."},409);
  const insRaw=await env.AUTH_KV.get("inspector:"+mobile);const ins=insRaw?JSON.parse(insRaw):{mobile,firstSeen:new Date().toISOString(),visitCount:0};ins.name=name;ins.company=company;ins.email=String(b.email||"").trim()||ins.email||null;ins.visitCount=(ins.visitCount||0)+1;await env.AUTH_KV.put("inspector:"+mobile,JSON.stringify(ins));
  const visitDate=/^\d{4}-\d{2}-\d{2}$/.test(b.visitDate||"")?b.visitDate:istDate();const id=randId();const visit={id,mobile,name,company,email:ins.email,buyer,po:String(b.po||"").trim()||null,visitDate,registeredBy:sess.mobile,registeredByName:sess.name,registeredAt:new Date().toISOString(),status:"open",qv:QUESTION_VERSION};
  await env.AUTH_KV.put("visit:"+id,JSON.stringify(visit));await env.AUTH_KV.put("openvisit:"+mobile,id,{expirationTtl:VISIT_TTL});
  const mk=visitDate.slice(0,7);const idxRaw=await env.AUTH_KV.get("visitidx:"+mk);const idx=idxRaw?JSON.parse(idxRaw):[];idx.push(id);await env.AUTH_KV.put("visitidx:"+mk,JSON.stringify(idx));
  return json({ok:true,visit});}
// Staff: visits for a date, with live status so QC can chase before the inspector leaves.
if(path==="/survey/visits"&&request.method==="GET"){if(!await requireStaff(request,env,["quality","admin","management"]))return json({ok:false,error:"Unauthorized"},401);const date=url.searchParams.get("date")||istDate();const mk=date.slice(0,7);const idxRaw=await env.AUTH_KV.get("visitidx:"+mk);const idx=idxRaw?JSON.parse(idxRaw):[];const all=await Promise.all(idx.map(async id=>{const raw=await env.AUTH_KV.get("visit:"+id);return raw?JSON.parse(raw):null;}));return json({ok:true,visits:all.filter(v=>v&&v.visitDate===date)});}
// Public: OTP only to a registered inspector who has an open visit. Otherwise this is an SMS relay.
if(path==="/survey/auth/send-otp"&&request.method==="POST"){const{mobile}=await request.json();if(!mobile||!/^[6-9]\d{9}$/.test(mobile))return json({ok:false,error:"Invalid mobile number"},400);const insRaw=await env.AUTH_KV.get("inspector:"+mobile);const openRaw=await env.AUTH_KV.get("openvisit:"+mobile);if(!insRaw||!openRaw)return json({ok:false,error:"No inspection visit is registered for this number. Please ask the Sara Textiles quality team to register your visit."},403);const r=await otpSend(mobile,env,"i:");return r.ok?json({ok:true}):json({ok:false,error:r.error},r.status);}
if(path==="/survey/auth/verify-otp"&&request.method==="POST"){const{mobile,otp}=await request.json();if(!mobile||!otp)return json({ok:false,error:"Missing fields"},400);const openRaw=await env.AUTH_KV.get("openvisit:"+mobile);if(!openRaw)return json({ok:false,error:"No inspection visit is open for this number."},403);const v=await otpVerify(mobile,otp,env,"i:");if(!v.ok)return json({ok:false,error:v.error},v.status);const insRaw=await env.AUTH_KV.get("inspector:"+mobile);const ins=insRaw?JSON.parse(insRaw):{};const token=randToken();const sess={mobile,scope:"inspector",visitId:openRaw,name:ins.name||null,company:ins.company||null,created:Date.now()};await env.AUTH_KV.put("sess:"+token,JSON.stringify(sess),{expirationTtl:INSP_SESS_TTL});return json({ok:true,token,name:sess.name,company:sess.company});}
if(path==="/survey/pending"&&request.method==="GET"){const sess=await requireInspector(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);const raw=await env.AUTH_KV.get("visit:"+sess.visitId);if(!raw)return json({ok:false,error:"This survey has expired."},410);const visit=JSON.parse(raw);if(visit.status!=="open")return json({ok:false,error:"This survey has already been submitted."},409);return json({ok:true,visit:{id:visit.id,name:visit.name,company:visit.company,buyer:visit.buyer,po:visit.po,visitDate:visit.visitDate},qv:QUESTION_VERSION,dims:DIMS});}
if(path==="/survey/submit"&&request.method==="POST"){const sess=await requireInspector(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);const raw=await env.AUTH_KV.get("visit:"+sess.visitId);if(!raw)return json({ok:false,error:"This survey has expired."},410);const visit=JSON.parse(raw);if(visit.status!=="open")return json({ok:false,error:"This survey has already been submitted."},409);
  const b=await request.json();const ratings={};let low=false;
  for(const d of DIMS){const n=Number(b.ratings&&b.ratings[d]);if(!Number.isInteger(n)||n<1||n>5)return json({ok:false,error:"Please rate every question from 1 to 5."},400);ratings[d]=n;if(n<=LOW_RATING)low=true;}
  const result=String(b.result||"");if(result!=="passed"&&result!=="failed")return json({ok:false,error:"Please select the final inspection result."},400);
  const comment=String(b.comment||"").trim();
  // A low score with no explanation is unactionable at this volume, so require the why.
  if(low&&!comment)return json({ok:false,error:"Please tell us what went wrong, since you rated one or more areas 3 or below."},400);
  if(comment.length>4000)return json({ok:false,error:"Comment is too long."},400);
  const resp={visitId:visit.id,mobile:sess.mobile,ratings,comment:comment||null,result,qv:QUESTION_VERSION,submittedAt:new Date().toISOString()};
  await env.AUTH_KV.put("response:"+visit.id,JSON.stringify(resp));
  visit.status="submitted";visit.submittedAt=resp.submittedAt;await env.AUTH_KV.put("visit:"+visit.id,JSON.stringify(visit));
  await env.AUTH_KV.delete("openvisit:"+sess.mobile);
  await env.AUTH_KV.delete("sess:"+sess._token);
  return json({ok:true});}
// Report returns raw records; the page aggregates. At ~40 visits/month that is a handful of reads.
if(path.startsWith("/survey/report/")&&request.method==="GET"){if(!await requireStaff(request,env,["quality","admin","management"]))return json({ok:false,error:"Unauthorized"},401);const mk=path.split("/")[3]||"";if(!/^\d{4}-\d{2}$/.test(mk))return json({ok:false,error:"Invalid month"},400);const idxRaw=await env.AUTH_KV.get("visitidx:"+mk);const idx=idxRaw?JSON.parse(idxRaw):[];const rows=await Promise.all(idx.map(async id=>{const[vRaw,rRaw]=await Promise.all([env.AUTH_KV.get("visit:"+id),env.AUTH_KV.get("response:"+id)]);if(!vRaw)return null;const v=JSON.parse(vRaw);return{visit:{id:v.id,name:v.name,company:v.company,buyer:v.buyer,po:v.po,visitDate:v.visitDate,status:v.status,registeredByName:v.registeredByName||null},response:rRaw?JSON.parse(rRaw):null};}));return json({ok:true,month:mk,qv:QUESTION_VERSION,dims:DIMS,rows:rows.filter(Boolean)});}
/* ---------- Material code requests (/matcode/) ---------- */

// A department fills the form without logging in; the request only counts once its head of
// department has approved it with an OTP sent to the HOD's own phone. Approved requests wait in a
// queue for the job on the Mac mini, which checks SAP for likely duplicates and emails EDP.
if(path==="/matcode/depts"&&request.method==="GET"){
  const cfg=await mcConfig(env);
  return json({ok:true,depts:Object.keys(cfg.depts).filter(id=>cfg.depts[id].hod).map(id=>({id,label:cfg.depts[id].label||id,hod:cfg.depts[id].hod.name,mobile:mcMask(cfg.depts[id].hod.mobile)}))});}
if(path==="/matcode/requests"&&request.method==="POST"){
  const b=await request.json();const cfg=await mcConfig(env);const dept=String(b.dept||"");const d=cfg.depts[dept];
  if(!d||!d.hod)return json({ok:false,error:"This department is not set up for material code requests yet."},400);
  const requester=mcText(b.requester);if(!requester||requester.length>60)return json({ok:false,error:"Please enter your name."},400);
  const requesterMobile=String(b.requesterMobile||"").replace(/\D/g,"");if(requesterMobile&&!/^[6-9]\d{9}$/.test(requesterMobile))return json({ok:false,error:"Your mobile number is not valid."},400);
  const src=Array.isArray(b.lines)?b.lines:[];if(!src.length)return json({ok:false,error:"Add at least one material."},400);
  if(src.length>MC_MAX_LINES)return json({ok:false,error:"A request can hold at most "+MC_MAX_LINES+" materials."},400);
  const lines=[];
  for(let i=0;i<src.length;i++){const line={};
    for(const f of MC_FIELDS){const v=mcText(src[i]&&src[i][f.k]);
      if(f.req&&!v)return json({ok:false,error:"Material "+(i+1)+": "+f.label+" is required."},400);
      if(v.length>f.max)return json({ok:false,error:"Material "+(i+1)+": "+f.label+" is longer than "+f.max+" characters."},400);
      if(v&&f.re&&!f.re.test(v))return json({ok:false,error:"Material "+(i+1)+": "+f.label+" is not valid."},400);
      line[f.k]=v;}
    lines.push(line);}
  if(!await mcHodLimit(env,d.hod.mobile))return json({ok:false,error:"Too many requests are waiting for this department's approval. Please try again in an hour."},429);
  const id=randId();
  const req={id,no:dept.toUpperCase()+"-"+istDate().slice(2).replace(/-/g,"")+"-"+id.slice(0,4).toUpperCase(),dept,deptLabel:d.label||dept,requester,requesterMobile:requesterMobile||null,lines,status:"pending",createdAt:new Date().toISOString(),hod:{name:d.hod.name,mobile:d.hod.mobile}};
  // Unapproved requests expire on their own after a day.
  await env.AUTH_KV.put("mcreq:"+id,JSON.stringify(req),{expirationTtl:MC_PENDING_TTL});
  const r=await otpSend(d.hod.mobile,env,"m:"+id+":");
  // The request is saved either way; if the SMS failed the page offers Resend.
  return json({ok:true,otpSent:r.ok,otpError:r.ok?null:r.error,request:await mcView(env,req)});}
const mcm=path.match(/^\/matcode\/requests\/([a-f0-9]{24})(?:\/([a-z]+))?$/);
if(mcm){
  const id=mcm[1];const action=mcm[2]||"";const raw=await env.AUTH_KV.get("mcreq:"+id);
  if(!raw)return json({ok:false,error:"This request was not found. A request that is not approved within 24 hours is discarded."},404);
  const req=JSON.parse(raw);
  // The id is unguessable and is the only credential here: whoever holds the link (the requester,
  // or the HOD it was forwarded to) may read the request and enter the OTP.
  if(!action&&request.method==="GET")return json({ok:true,request:await mcView(env,req)});
  if(action==="sent"&&request.method==="POST"){
    if(!mcService(request,env))return json({ok:false,error:"Unauthorized"},401);
    if(req.status!=="approved")return json({ok:false,error:"Request is not waiting to be sent."},409);
    const b=await request.json();req.status="sent";req.sentAt=new Date().toISOString();req.sentTo=Array.isArray(b.sentTo)?b.sentTo:[];req.dupes=b.dupes||null;req.note=mcText(b.note).slice(0,300)||null;
    await env.AUTH_KV.put("mcreq:"+id,JSON.stringify(req));await env.AUTH_KV.delete("mcq:"+id);
    return json({ok:true});}
  if(req.status!=="pending")return json({ok:false,error:"This request has already been approved."},409);
  if(action==="attachments"&&request.method==="POST"){
    const line=parseInt(url.searchParams.get("line")||"",10);if(!(line>=1&&line<=req.lines.length))return json({ok:false,error:"Unknown material line."},400);
    const type=(request.headers.get("Content-Type")||"").split(";")[0].trim();if(MC_ATT_TYPES.indexOf(type)===-1)return json({ok:false,error:"Attach a PDF, JPG, PNG or Excel file."},400);
    const name=mcText(url.searchParams.get("name")).replace(/[^\w.\- ()]/g,"_").slice(0,80)||"attachment";
    const body=await request.arrayBuffer();if(!body.byteLength)return json({ok:false,error:"The file is empty."},400);
    if(body.byteLength>MC_ATT_MAX)return json({ok:false,error:"The file is larger than 4 MB."},400);
    await env.AUTH_KV.put("mcatt:"+id+":"+line,body,{expirationTtl:MC_ATT_TTL,metadata:{name,type,size:body.byteLength}});
    return json({ok:true});}
  if(action==="resend"&&request.method==="POST"){
    if(!await mcHodLimit(env,req.hod.mobile))return json({ok:false,error:"Too many OTPs have been sent to this department's head. Please try again in an hour."},429);
    const r=await otpSend(req.hod.mobile,env,"m:"+id+":");return r.ok?json({ok:true}):json({ok:false,error:r.error},r.status);}
  if(action==="approve"&&request.method==="POST"){
    const{otp}=await request.json();if(!otp)return json({ok:false,error:"Enter the OTP."},400);
    const v=await otpVerify(req.hod.mobile,String(otp),env,"m:"+id+":");if(!v.ok)return json({ok:false,error:v.error},v.status);
    req.status="approved";req.approvedAt=new Date().toISOString();
    // Written again without a TTL: an approved request is a permanent record.
    await env.AUTH_KV.put("mcreq:"+id,JSON.stringify(req));await env.AUTH_KV.put("mcq:"+id,"1");
    const mk=istDate().slice(0,7);const idxRaw=await env.AUTH_KV.get("mcidx:"+mk);const idx=idxRaw?JSON.parse(idxRaw):[];idx.push(id);await env.AUTH_KV.put("mcidx:"+mk,JSON.stringify(idx));
    return json({ok:true,request:await mcView(env,req)});}
  return json({ok:false,error:"Not found"},404);}
// Mac mini job: approved requests not yet emailed, and who to email them to.
if(path==="/matcode/queue"&&request.method==="GET"){
  if(!mcService(request,env))return json({ok:false,error:"Unauthorized"},401);
  const cfg=await mcConfig(env);const page=await env.AUTH_KV.list({prefix:"mcq:"});
  const reqs=await Promise.all(page.keys.map(async k=>{const raw=await env.AUTH_KV.get("mcreq:"+k.name.slice(4));return raw?await mcView(env,JSON.parse(raw)):null;}));
  return json({ok:true,email:cfg.email,requests:reqs.filter(Boolean)});}
const mca=path.match(/^\/matcode\/attachments\/([a-f0-9]{24})\/(\d{1,2})$/);
if(mca&&request.method==="GET"){
  if(!mcService(request,env)&&!await requireAdmin(request,env))return json({ok:false,error:"Unauthorized"},401);
  const got=await env.AUTH_KV.getWithMetadata("mcatt:"+mca[1]+":"+parseInt(mca[2],10),{type:"arrayBuffer"});
  if(!got.value)return json({ok:false,error:"Not found"},404);
  return new Response(got.value,{headers:{"Content-Type":(got.metadata&&got.metadata.type)||"application/octet-stream",...CORS}});}
// Admin: who approves for each department, and where approved requests are emailed.
if(path==="/matcode/admin/config"&&request.method==="GET"){if(!await requireAdmin(request,env))return json({ok:false,error:"Unauthorized"},401);return json({ok:true,config:await mcConfig(env)});}
if(path==="/matcode/admin/config"&&request.method==="POST"){
  const sess=await requireAdmin(request,env);if(!sess)return json({ok:false,error:"Unauthorized"},401);
  const b=await request.json();const depts={};
  for(const id of Object.keys(b.depts||{})){
    if(!/^[a-z0-9]{2,12}$/.test(id))return json({ok:false,error:"Invalid department id: "+id},400);
    const d=b.depts[id]||{};const label=mcText(d.label).slice(0,40)||id;let hod=null;
    if(d.hod&&(d.hod.name||d.hod.mobile)){const name=mcText(d.hod.name);const mobile=String(d.hod.mobile||"").replace(/\D/g,"");
      if(!name||name.length>60)return json({ok:false,error:label+": enter the head of department's name."},400);
      if(!/^[6-9]\d{9}$/.test(mobile))return json({ok:false,error:label+": the head of department's mobile number is not valid."},400);
      hod={name,mobile};}
    depts[id]={label,hod};}
  const email=[].concat(b.email||[]).map(e=>String(e).trim().toLowerCase()).filter(Boolean);
  if(email.some(e=>!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)))return json({ok:false,error:"One of the email addresses is not valid."},400);
  await env.AUTH_KV.put(MC_CFG_KEY,JSON.stringify({depts,email}));
  await dirLog(env,sess,"matcode-config",{depts:Object.keys(depts).filter(id=>depts[id].hod),email});
  return json({ok:true,config:{depts,email}});}
if(path==="/matcode/admin/requests"&&request.method==="GET"){
  if(!await requireAdmin(request,env))return json({ok:false,error:"Unauthorized"},401);
  const mk=url.searchParams.get("month")||istDate().slice(0,7);if(!/^\d{4}-\d{2}$/.test(mk))return json({ok:false,error:"Invalid month"},400);
  const idxRaw=await env.AUTH_KV.get("mcidx:"+mk);const idx=idxRaw?JSON.parse(idxRaw):[];
  const rows=await Promise.all(idx.map(async id=>{const raw=await env.AUTH_KV.get("mcreq:"+id);return raw?await mcView(env,JSON.parse(raw)):null;}));
  return json({ok:true,month:mk,requests:rows.filter(Boolean).reverse()});}
return json({ok:false,error:"Not found"},404);}};
