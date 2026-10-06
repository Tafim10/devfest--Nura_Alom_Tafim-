/* Tender Package Builder v2
   Competition-focused frontend-only implementation.
   All tender document bytes remain in the browser.
*/
const { PDFDocument, StandardFonts, rgb } = PDFLib;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

const MAX_FILES = 30;
const MAX_BYTES = 50 * 1024 * 1024;
const DB_NAME = "devfest-tender-builder";
const DB_VERSION = 1;
const DB_STORE = "projects";

const state = {
  lang: "en",
  requirements: null,
  files: [],
  matches: new Map(),
  expiry: new Map(),
  processing: false,
  signature: null,
  signaturePages: new Map(), // reqId -> "1,2"
  preview: { fileId:null, pdf:null, page:1, loading:false }
};

const demoRequirements = {
  tender: {
    tender_id: "T-2026-0417",
    title: "Supply of IT Equipment",
    procuring_entity: "Example Directorate",
    bidder: "Example Company Ltd.",
    submission_deadline: "2026-10-20"
  },
  requirements: [
    { id:"R01", order:1, title_en:"Trade License", title_bn:"ট্রেড লাইসেন্স", mandatory:true, has_expiry:true },
    { id:"R02", order:2, title_en:"TIN Certificate", title_bn:"টিআইএন সনদ", mandatory:true, has_expiry:true },
    { id:"R03", order:3, title_en:"VAT Certificate", title_bn:"ভ্যাট সনদ", mandatory:true, has_expiry:true },
    { id:"R04", order:4, title_en:"Bank Solvency Letter", title_bn:"ব্যাংক সলভেন্সি লেটার", mandatory:true, has_expiry:false },
    { id:"R05", order:5, title_en:"Experience Certificate", title_bn:"অভিজ্ঞতার সনদ", mandatory:false, has_expiry:false },
    { id:"R06", order:6, title_en:"Technical Proposal", title_bn:"কারিগরি প্রস্তাব", mandatory:true, has_expiry:false },
    { id:"R07", order:7, title_en:"Financial Proposal", title_bn:"আর্থিক প্রস্তাব", mandatory:true, has_expiry:false }
  ]
};

const T = {
  en: {
    appTitle:"Tender Package Builder", appSubtitle:"Turn tender PDFs into one checked, ordered submission package.", toggle:"বাংলা",
    local:"100% local", heroTitle:"Prepare a submission package without missing documents.",
    heroText:"Load tender requirements, add PDFs, auto-match where possible, resolve blocking issues, and generate the final ordered package.",
    ready:"package readiness", required:"required", matched:"matched", blocking:"blocking", optionalCount:"optional",
    requirements:"Tender requirements", load:"Load requirements.json", demo:"Load demo", emptyReqTitle:"Start with requirements.json",
    emptyReqText:"The app will show tender details and required documents sorted by order.", loaded:"Requirements loaded",
    reqHint:"Use Auto-match to get filename-based suggestions.", autoMatch:"Auto-match suggestions", autoAll:"Auto-match all",
    upload:"Upload PDF files", dropTitle:"Drop PDFs here or browse", dropText:"Up to 30 PDFs and 50 MB total. Non-PDF files are rejected.",
    searchFiles:"Search uploaded files…", duplicateHelp:"Exact duplicate PDFs are grouped automatically.",
    match:"Match & check", checkEmpty:"Load requirements to see the checklist.",
    bonus:"Bonus tools", csvTitle:"Export checklist", csvText:"Download document, file, pages, expiry and status as CSV.", exportCsv:"Export CSV",
    signatureTitle:"Seal / signature", signatureText:"Upload a PNG and optionally place it on selected source-document pages.", uploadPng:"Upload PNG",
    notAdded:"Not added", previewTitle:"PDF preview", previewText:"Open the first page of any uploaded PDF before matching it.", previewHint:"Use Preview on a file card.",
    package:"Generate package", indexOption:"Include index page", signatureOption:"Apply uploaded signature", generate:"Generate package",
    tenderId:"Tender ID", tenderTitle:"Tender title", entity:"Procuring entity", bidder:"Bidder", deadline:"Submission deadline",
    order:"Order", document:"Document", requiredLabel:"Required", expiry:"Expiry", status:"Status", yes:"Yes", no:"No", pages:"pages", file:"file", files:"files",
    selectFile:"Select a PDF…", noFile:"No file matched", optional:"Optional", remove:"Remove", preview:"Preview",
    duplicate:"Duplicate content", suggestion:"Suggested match", confidence:"confidence", page:"page", pagesToSign:"Sign pages in this document (e.g. 1,2)",
    missing:"Missing", expiryNeeded:"Expiry date needed", expired:"Expired", notProvided:"Not provided", ok:"OK",
    issueSummary:"Issue summary", issueMissing:"Missing required", issueExpiry:"Expiry needed", issueExpired:"Expired",
    readyMsg:"All blocking checks are resolved. The package can be generated.", loadReqFirst:"Load requirements.json before matching files.",
    invalidReq:"The JSON file is not a valid tender requirements file.", reqLoaded:"Requirements loaded successfully.",
    tooMany:"You can upload up to 30 PDF files.", tooLarge:"The 50 MB total upload limit would be exceeded.",
    nonPdf:"Only PDF files are allowed. Rejected", pdfBad:"Could not read this PDF. It may be damaged or password-protected.",
    uploaded:"PDF added.", duplicateWarn:"Duplicate content detected. Matching duplicate files to different documents is not allowed.",
    packageFail:"Package generation failed. Processing remains in your browser.", packageReady:"Package generated successfully.",
    generatedFile:"Download package", saved:"Work saved locally in this browser.", restored:"Saved work reopened.",
    nothingSaved:"No saved project was found in this browser.", signatureAdded:"PNG signature added.",
    signatureNone:"Upload a PNG first.", savedAt:"Saved", signatureSize:"Signature width", signaturePages:"Selected pages are relative to each matched document.",
    noSuggestions:"No high-confidence matches were found.", autoMatched:"Auto-matched", exportDone:"CSV exported.",
    filename:"File", matchedDoc:"Matched document", noMatch:"No match", packagePage:"Package page",
    localOnly:"Your documents never leave this browser.", overwriteWarning:"Loading a new requirements file resets matches and expiry entries.",
    allGood:"Ready", blockingCount:"blocking issue(s)"
  },
  bn: {
    appTitle:"টেন্ডার প্যাকেজ বিল্ডার", appSubtitle:"টেন্ডারের PDF ফাইলগুলো যাচাই করে সঠিক ক্রমে একটি সাবমিশন প্যাকেজ তৈরি করুন।", toggle:"English",
    local:"১০০% লোকাল", heroTitle:"কোনো প্রয়োজনীয় ডকুমেন্ট বাদ না দিয়ে সাবমিশন প্যাকেজ তৈরি করুন।",
    heroText:"টেন্ডার রিকোয়ারমেন্ট লোড করুন, PDF যোগ করুন, সম্ভব হলে অটো-ম্যাচ করুন, ব্লকিং সমস্যা সমাধান করুন এবং সঠিক ক্রমে প্যাকেজ তৈরি করুন।",
    ready:"প্যাকেজ প্রস্তুতি", required:"আবশ্যিক", matched:"ম্যাচড", blocking:"ব্লকিং", optionalCount:"ঐচ্ছিক",
    requirements:"টেন্ডার রিকোয়ারমেন্ট", load:"requirements.json লোড করুন", demo:"ডেমো লোড", emptyReqTitle:"requirements.json দিয়ে শুরু করুন",
    emptyReqText:"টেন্ডারের তথ্য ও প্রয়োজনীয় ডকুমেন্টের তালিকা অর্ডার অনুযায়ী দেখানো হবে।", loaded:"রিকোয়ারমেন্ট লোড হয়েছে",
    reqHint:"ফাইলের নাম দেখে Auto-match সাজেশন পাওয়া যাবে।", autoMatch:"অটো-ম্যাচ সাজেশন", autoAll:"সব অটো-ম্যাচ",
    upload:"PDF ফাইল আপলোড", dropTitle:"এখানে PDF টেনে আনুন বা ব্রাউজ করুন", dropText:"সর্বোচ্চ ৩০টি PDF এবং মোট ৫০ MB। PDF ছাড়া ফাইল বাতিল হবে।",
    searchFiles:"আপলোড করা ফাইল খুঁজুন…", duplicateHelp:"একই কনটেন্টের PDF স্বয়ংক্রিয়ভাবে ডুপ্লিকেট হিসেবে ধরা হয়।",
    match:"ম্যাচ ও যাচাই", checkEmpty:"চেকলিস্ট দেখতে requirements লোড করুন।",
    bonus:"বোনাস টুল", csvTitle:"চেকলিস্ট এক্সপোর্ট", csvText:"ডকুমেন্ট, ফাইল, পৃষ্ঠা, মেয়াদ ও স্ট্যাটাস CSV হিসেবে ডাউনলোড করুন।", exportCsv:"CSV এক্সপোর্ট",
    signatureTitle:"সিল / স্বাক্ষর", signatureText:"PNG আপলোড করে নির্বাচিত source-document page-এ বসাতে পারবেন।", uploadPng:"PNG আপলোড",
    notAdded:"যোগ করা হয়নি", previewTitle:"PDF প্রিভিউ", previewText:"ম্যাচ করার আগে যেকোনো PDF-এর প্রথম পৃষ্ঠা দেখুন।", previewHint:"ফাইল কার্ডে Preview চাপুন।",
    package:"প্যাকেজ তৈরি", indexOption:"ইনডেক্স পেজ রাখুন", signatureOption:"আপলোড করা স্বাক্ষর প্রয়োগ করুন", generate:"প্যাকেজ তৈরি করুন",
    tenderId:"টেন্ডার আইডি", tenderTitle:"টেন্ডার শিরোনাম", entity:"প্রকিউরিং প্রতিষ্ঠান", bidder:"বিডার", deadline:"সাবমিশন ডেডলাইন",
    order:"ক্রম", document:"ডকুমেন্ট", requiredLabel:"আবশ্যিক", expiry:"মেয়াদ", status:"স্ট্যাটাস", yes:"হ্যাঁ", no:"না", pages:"পৃষ্ঠা", file:"ফাইল", files:"ফাইল",
    selectFile:"একটি PDF নির্বাচন করুন…", noFile:"কোনো ফাইল ম্যাচ করা হয়নি", optional:"ঐচ্ছিক", remove:"মুছুন", preview:"প্রিভিউ",
    duplicate:"ডুপ্লিকেট কনটেন্ট", suggestion:"সম্ভাব্য ম্যাচ", confidence:"নির্ভরযোগ্যতা", page:"পৃষ্ঠা", pagesToSign:"এই ডকুমেন্টের কোন পেজে স্বাক্ষর? যেমন 1,2",
    missing:"অনুপস্থিত", expiryNeeded:"মেয়াদপূর্তির তারিখ দরকার", expired:"মেয়াদ শেষ", notProvided:"দেওয়া হয়নি", ok:"ঠিক আছে",
    issueSummary:"সমস্যার সারাংশ", issueMissing:"প্রয়োজনীয় ডকুমেন্ট অনুপস্থিত", issueExpiry:"মেয়াদ দরকার", issueExpired:"মেয়াদ শেষ",
    readyMsg:"সব ব্লকিং সমস্যা সমাধান হয়েছে। এখন প্যাকেজ তৈরি করা যাবে।", loadReqFirst:"ফাইল ম্যাচ করার আগে requirements.json লোড করুন।",
    invalidReq:"JSON ফাইলটি সঠিক tender requirements ফাইল নয়।", reqLoaded:"রিকোয়ারমেন্ট সফলভাবে লোড হয়েছে।",
    tooMany:"সর্বোচ্চ ৩০টি PDF আপলোড করা যাবে।", tooLarge:"মোট ৫০ MB সীমা অতিক্রম হবে।",
    nonPdf:"শুধুমাত্র PDF ফাইল গ্রহণ করা হবে। বাতিল করা হয়েছে", pdfBad:"PDF পড়া যায়নি। ফাইলটি নষ্ট বা পাসওয়ার্ড-প্রটেক্টেড হতে পারে।",
    uploaded:"PDF যোগ হয়েছে।", duplicateWarn:"একই কনটেন্টের ডুপ্লিকেট পাওয়া গেছে। আলাদা ডকুমেন্টে ডুপ্লিকেট ম্যাচ করা যাবে না।",
    packageFail:"প্যাকেজ তৈরি ব্যর্থ হয়েছে। সব প্রসেস ব্রাউজারেই হয়েছে।", packageReady:"প্যাকেজ সফলভাবে তৈরি হয়েছে।",
    generatedFile:"প্যাকেজ ডাউনলোড", saved:"এই ব্রাউজারে কাজ লোকালি সেভ হয়েছে।", restored:"সেভ করা কাজ পুনরায় খোলা হয়েছে।",
    nothingSaved:"এই ব্রাউজারে কোনো সেভ করা প্রজেক্ট পাওয়া যায়নি।", signatureAdded:"PNG স্বাক্ষর যোগ হয়েছে।",
    signatureNone:"আগে একটি PNG আপলোড করুন।", savedAt:"সেভ", signatureSize:"স্বাক্ষরের প্রস্থ", signaturePages:"নির্বাচিত পেজ নম্বর matched document-এর ভেতরের পেজ হিসেবে ধরা হবে।",
    noSuggestions:"উচ্চ-নির্ভরযোগ্য কোনো ম্যাচ পাওয়া যায়নি।", autoMatched:"অটো-ম্যাচ হয়েছে", exportDone:"CSV এক্সপোর্ট হয়েছে।",
    filename:"ফাইল", matchedDoc:"ম্যাচড ডকুমেন্ট", noMatch:"ম্যাচ নেই", packagePage:"প্যাকেজ পেজ",
    localOnly:"আপনার ডকুমেন্ট এই ব্রাউজারের বাইরে যায় না।", overwriteWarning:"নতুন requirements লোড করলে বর্তমান match ও expiry reset হবে।",
    allGood:"প্রস্তুত", blockingCount:"টি ব্লকিং সমস্যা"
  }
};

const $ = id => document.getElementById(id);
const t = key => T[state.lang][key] ?? key;
const escapeHtml = s => String(s ?? "").replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const fmtMB = b => (b/1024/1024).toFixed(2);
const fmtDate = date => {
  const d = new Date(date), y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};

function setMessage(el, text, kind="info"){
  el.textContent=text; el.className=`message ${kind}`;
}
function clearMessage(el){ el.textContent=""; el.className="message hidden"; }
function titleFor(req){ return state.lang==="bn" ? req.title_bn : req.title_en; }

function normalizeReq(data){
  if(!data || typeof data!=="object" || !data.tender || !Array.isArray(data.requirements)) throw new Error("invalid");
  if(!data.tender.tender_id || !data.tender.submission_deadline) throw new Error("invalid");
  const reqs=data.requirements.map(r=>({
    id:String(r.id), order:Number(r.order), title_en:String(r.title_en??""),
    title_bn:String(r.title_bn??r.title_en??""), mandatory:Boolean(r.mandatory), has_expiry:Boolean(r.has_expiry)
  })).sort((a,b)=>a.order-b.order);
  if(!reqs.length || reqs.some(r=>!r.id || !r.title_en || !Number.isFinite(r.order))) throw new Error("invalid");
  return {tender:{
    tender_id:String(data.tender.tender_id), title:String(data.tender.title??""),
    procuring_entity:String(data.tender.procuring_entity??""), bidder:String(data.tender.bidder??""),
    submission_deadline:String(data.tender.submission_deadline)
  },requirements:reqs};
}

async function hashBuffer(buffer){
  const d=await crypto.subtle.digest("SHA-256",buffer);
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function inspectPdf(file){
  try{
    const bytes=await file.arrayBuffer();
    const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
    return {bytes,pages:pdf.numPages};
  }catch{ throw new Error("badpdf"); }
}

function totalBytes(){ return state.files.reduce((n,f)=>n+f.file.size,0); }
function duplicateGroup(id){
  const f=state.files.find(x=>x.id===id); return f ? state.files.filter(x=>x.hash===f.hash) : [];
}
function matchOwner(fileId, excludeReqId){
  for(const [rid,fid] of state.matches.entries()) if(fid===fileId && rid!==excludeReqId) return rid;
  return null;
}
function usedByDuplicate(fileId, reqId){
  return duplicateGroup(fileId).some(f=>matchOwner(f.id,reqId));
}
function statusFor(req){
  const fileId=state.matches.get(req.id);
  if(!fileId) return req.mandatory ? {key:"missing",blocking:true,label:t("missing")} : {key:"not-provided",blocking:false,label:t("notProvided")};
  if(req.has_expiry){
    const date=state.expiry.get(req.id);
    if(!date) return {key:"expiry",blocking:true,label:t("expiryNeeded")};
    if(date<state.requirements.tender.submission_deadline) return {key:"expired",blocking:true,label:t("expired")};
  }
  return {key:"ok",blocking:false,label:t("ok")};
}
function blockingList(){ return state.requirements?.requirements.map(req=>({req,status:statusFor(req)})).filter(x=>x.status.blocking)??[]; }

function cleanName(name){
  return name.toLowerCase().replace(/\.[a-z0-9]+$/,"").replace(/[^a-z0-9\u0980-\u09ff]+/g," ").trim();
}
function tokens(s){ return cleanName(s).split(/\s+/).filter(x=>x.length>1); }
function similarity(file, req){
  const fileText=cleanName(file.file.name);
  const reqText=`${cleanName(req.title_en)} ${cleanName(req.title_bn)} ${cleanName(req.id)}`;
  const ft=new Set(tokens(file.file.name)), rt=new Set(tokens(reqText));
  let common=0; rt.forEach(x=>{if(ft.has(x)) common++;});
  const overlap=rt.size ? common/rt.size : 0;
  let score=overlap;
  if(fileText.includes(cleanName(req.title_en))) score+=0.58;
  if(fileText.includes(cleanName(req.id))) score+=0.35;
  const aliases=[
    ["trade","license"],["tin","tax"],["vat","mushak"],["solvency","bank"],["experience","certificate"],
    ["technical","proposal"],["financial","proposal"]
  ];
  aliases.forEach(pair=>{
    if(pair.every(k=>fileText.includes(k)) && pair.every(k=>rt.has(k))) score+=0.15;
  });
  return Math.min(1,score);
}
function suggestionsForReq(req){
  return state.files.map(f=>({file:f,score:similarity(f,req)}))
    .filter(x=>x.score>=0.34)
    .sort((a,b)=>b.score-a.score);
}
function bestSuggestion(req){
  const arr=suggestionsForReq(req);
  if(!arr.length) return null;
  const top=arr[0], second=arr[1];
  if(usedByDuplicate(top.file.id,req.id)) return null;
  if(top.score<0.55 && second && top.score-second.score<0.08) return null;
  return top;
}
function pct(score){ return Math.round(score*100); }

function updateDashboard(){
  const reqs=state.requirements?.requirements??[];
  const required=reqs.filter(r=>r.mandatory).length, optional=reqs.filter(r=>!r.mandatory).length;
  const matched=reqs.filter(r=>state.matches.has(r.id)).length, issues=blockingList().length;
  $("requiredCount").textContent=required; $("optionalCount").textContent=optional; $("matchedCount").textContent=matched; $("issueCount").textContent=issues;
  const readiness=reqs.length ? Math.round((reqs.length-issues)/reqs.length*100) : 0;
  $("readyStat").textContent=`${readiness}%`;
  $("readyStatLabel").textContent=t("ready");
  $("autoMatchBtn").disabled=!state.requirements;
  $("generateBtn").disabled=issues>0 || !state.requirements || state.processing;
}
function updateIssueDashboard(){
  if(!state.requirements){ $("issueDashboard").innerHTML=""; return; }
  const issues=blockingList();
  const missing=issues.filter(x=>x.status.key==="missing").length;
  const expiry=issues.filter(x=>x.status.key==="expiry").length;
  const expired=issues.filter(x=>x.status.key==="expired").length;
  $("issueDashboard").innerHTML=[
    [missing,t("issueMissing")], [expiry,t("issueExpiry")], [expired,t("issueExpired")]
  ].map(([n,l])=>`<div class="issue-card"><strong>${n}</strong><span>${escapeHtml(l)}</span></div>`).join("");
}

function renderRequirements(){
  const empty=$("requirementsEmpty"), detail=$("tenderDetails"), wrap=$("requirementsTableWrap"), toolbar=$("requirementsToolbar");
  if(!state.requirements){ empty.classList.remove("hidden"); detail.classList.add("hidden"); wrap.classList.add("hidden"); toolbar.classList.add("hidden"); return; }
  empty.classList.add("hidden"); toolbar.classList.remove("hidden");
  const tr=state.requirements.tender;
  detail.classList.remove("hidden");
  detail.innerHTML=[
    [t("tenderId"),tr.tender_id],[t("tenderTitle"),tr.title],[t("entity"),tr.procuring_entity],[t("bidder"),tr.bidder],[t("deadline"),tr.submission_deadline]
  ].map(([l,v])=>`<div class="detail-card"><div class="detail-label">${escapeHtml(l)}</div><div class="detail-value">${escapeHtml(v)}</div></div>`).join("");
  wrap.classList.remove("hidden");
  wrap.innerHTML=`<table class="req-table"><thead><tr>
    <th>${escapeHtml(t("order"))}</th><th>${escapeHtml(t("document"))}</th><th>${escapeHtml(t("requiredLabel"))}</th><th>${escapeHtml(t("expiry"))}</th><th>${escapeHtml(t("status"))}</th></tr></thead>
    <tbody>${state.requirements.requirements.map(r=>{
      const s=statusFor(r), sug=bestSuggestion(r);
      return `<tr><td>${r.order}</td><td><strong>${escapeHtml(titleFor(r))}</strong><div class="req-meta">${escapeHtml(r.id)}</div>
        ${sug&&!state.matches.has(r.id)?`<div class="suggestion-line">${escapeHtml(t("suggestion"))}: ${escapeHtml(sug.file.file.name)} · ${pct(sug.score)}%</div>`:""}
      </td><td>${r.mandatory?t("yes"):t("no")}</td><td>${r.has_expiry?t("yes"):t("no")}</td>
      <td><span class="status-chip status-${s.key}">${escapeHtml(s.label)}</span></td></tr>`;
    }).join("")}</tbody></table>`;
}

function renderFiles(){
  const query=$("fileSearch").value.trim().toLowerCase();
  const filtered=state.files.filter(f=>f.file.name.toLowerCase().includes(query));
  $("filesList").innerHTML=filtered.map(f=>{
    const dup=duplicateGroup(f.id).length>1;
    const ownerEntry=[...state.matches.entries()].find(([,fid])=>fid===f.id);
    const owner=ownerEntry ? state.requirements?.requirements.find(r=>r.id===ownerEntry[0]) : null;
    const suggestions=state.requirements?.requirements.map(r=>({req:r,score:similarity(f,r)})).filter(x=>x.score>=0.34).sort((a,b)=>b.score-a.score)??[];
    const top=suggestions[0];
    return `<div class="file-card ${dup?"duplicate":""}">
      <div>
        <div class="file-name">${escapeHtml(f.file.name)}</div>
        <div class="file-meta">
          <span class="file-tag">${f.pages} ${escapeHtml(f.pages===1?t("page"):t("pages"))}</span>
          <span class="file-tag">${fmtMB(f.file.size)} MB</span>
          ${dup?`<span class="file-tag dup">${escapeHtml(t("duplicate"))}</span>`:""}
          ${owner?`<span class="file-tag">${escapeHtml(titleFor(owner))}</span>`:""}
        </div>
        ${top&&!owner?`<div class="file-suggestion">${escapeHtml(t("suggestion"))}: <strong>${escapeHtml(titleFor(top.req))}</strong> · ${pct(top.score)}%</div>`:""}
      </div>
      <div class="file-actions">
        <button class="small-btn" type="button" data-preview-file="${f.id}">${escapeHtml(t("preview"))}</button>
        <button class="small-btn danger" type="button" data-remove-file="${f.id}">${escapeHtml(t("remove"))}</button>
      </div>
    </div>`;
  }).join("");
  const total=totalBytes(), count=state.files.length;
  $("quotaText").textContent=`${count} / ${MAX_FILES} ${count===1?t("file"):t("files")} · ${fmtMB(total)} MB / 50 MB`;
}

function renderChecklist(){
  if(!state.requirements){ $("checkEmpty").classList.remove("hidden"); $("checklist").classList.add("hidden"); $("legend").innerHTML=""; return; }
  $("checkEmpty").classList.add("hidden"); $("checklist").classList.remove("hidden");
  $("legend").innerHTML=["missing","expiry","expired","not-provided","ok"].map(k=>`<span class="status-chip status-${k}">${escapeHtml({missing:t("missing"),expiry:t("expiryNeeded"),expired:t("expired"),"not-provided":t("notProvided"),ok:t("ok")}[k])}</span>`).join("");
  $("checklist").innerHTML=state.requirements.requirements.map(req=>{
    const status=statusFor(req), selected=state.matches.get(req.id)||"", suggestion=!selected?bestSuggestion(req):null;
    const options=[`<option value="">${escapeHtml(req.mandatory?t("selectFile"):`${t("noFile")} (${t("optional")})`)}</option>`,
      ...state.files.map(f=>{
        const disabled=matchOwner(f.id,req.id) || usedByDuplicate(f.id,req.id);
        return `<option value="${f.id}" ${selected===f.id?"selected":""} ${disabled?"disabled":""}>${escapeHtml(f.file.name)} · ${f.pages} ${escapeHtml(t("pages"))}${duplicateGroup(f.id).length>1?" · DUP":""}</option>`;
      })].join("");
    const exp=req.has_expiry&&selected?`<input class="date-input" type="date" data-expiry="${escapeHtml(req.id)}" value="${escapeHtml(state.expiry.get(req.id)||"")}">`:"<div></div>";
    const signInput=selected?`<input class="date-input" type="text" placeholder="1,2" aria-label="${escapeHtml(t("pagesToSign"))}" data-signpages="${escapeHtml(req.id)}" value="${escapeHtml(state.signaturePages.get(req.id)||"")}">`:"";
    return `<div class="check-item">
      <div class="order-badge">${req.order}</div>
      <div><div class="req-title">${escapeHtml(titleFor(req))}</div>
        <div class="req-meta">${escapeHtml(req.id)} · ${req.mandatory?t("required"):t("optional")}${req.has_expiry?` · ${t("expiry")}`:""}</div>
        ${suggestion?`<div class="suggestion-line">${escapeHtml(t("suggestion"))}: <strong>${escapeHtml(suggestion.file.file.name)}</strong> · ${pct(suggestion.score)}%</div>`:""}
      </div>
      <div class="match-controls">
        <select class="select" data-match="${escapeHtml(req.id)}">${options}</select>
        ${exp}
        ${selected&&state.signature?signInput:""}
      </div>
      <div class="status-cell"><span class="status-chip status-${status.key}">${escapeHtml(status.label)}</span></div>
    </div>`;
  }).join("");
}

function renderSignatureConfig(){
  const box=$("signatureConfig");
  if(!state.signature){ box.classList.add("hidden"); box.innerHTML=""; return; }
  box.classList.remove("hidden");
  box.innerHTML=`<div><strong>${escapeHtml(t("signaturePages"))}</strong></div>
    <div class="tiny-help">${escapeHtml(state.signature.name)} · ${fmtMB(state.signature.bytes.byteLength)} MB</div>`;
}
function renderAll(){
  renderRequirements(); renderFiles(); renderChecklist(); updateIssueDashboard(); updateDashboard(); renderSignatureConfig();
  $("localPill").textContent=t("local");
  $("readyStatLabel").textContent=t("ready");
}
function resetMatches(){
  state.matches.clear(); state.expiry.clear(); state.signaturePages.clear();
}
function setRequirements(data){
  try{
    state.requirements=normalizeReq(data); resetMatches(); renderAll(); setMessage($("uploadMessage"),t("reqLoaded"),"success");
  }catch{
    state.requirements=null; resetMatches(); renderAll(); setMessage($("uploadMessage"),t("invalidReq"),"error");
  }
}

async function addFiles(fileList){
  const incoming=[...fileList];
  if(!incoming.length) return;
  if(state.files.length+incoming.length>MAX_FILES){ setMessage($("uploadMessage"),t("tooMany"),"error"); return; }
  if(totalBytes()+incoming.reduce((n,f)=>n+f.size,0)>MAX_BYTES){ setMessage($("uploadMessage"),t("tooLarge"),"error"); return; }
  clearMessage($("uploadMessage"));
  for(const file of incoming){
    const isPdf=file.type==="application/pdf"||file.name.toLowerCase().endsWith(".pdf");
    if(!isPdf){ setMessage($("uploadMessage"),`${t("nonPdf")} “${file.name}”.`,"error"); continue; }
    try{
      const {bytes,pages}=await inspectPdf(file), hash=await hashBuffer(bytes);
      state.files.push({id:crypto.randomUUID(),file,bytes,pages,hash});
      setMessage($("uploadMessage"),t("uploaded"),"success");
    }catch{ setMessage($("uploadMessage"),`${t("pdfBad")} “${file.name}”.`,"error"); }
  }
  renderAll();
}

function autoMatchAll(){
  if(!state.requirements) return;
  let count=0;
  for(const req of state.requirements.requirements){
    if(state.matches.has(req.id)) continue;
    const sug=bestSuggestion(req);
    if(!sug) continue;
    if(matchOwner(sug.file.id,req.id) || usedByDuplicate(sug.file.id,req.id)) continue;
    state.matches.set(req.id,sug.file.id); count++;
  }
  renderAll();
  setMessage($("uploadMessage"),count?`${t("autoMatched")}: ${count}`:t("noSuggestions"),count?"success":"info");
}

function applyMatch(reqId,fileId){
  if(!fileId){ state.matches.delete(reqId); state.expiry.delete(reqId); state.signaturePages.delete(reqId); renderAll(); return; }
  if(matchOwner(fileId,reqId)||usedByDuplicate(fileId,reqId)){ setMessage($("uploadMessage"),t("duplicateWarn"),"error"); renderAll(); return; }
  state.matches.set(reqId,fileId);
  const req=state.requirements.requirements.find(r=>r.id===reqId);
  if(req&&!req.has_expiry) state.expiry.delete(reqId);
  renderAll();
}

function switchLanguage(){
  state.lang=state.lang==="en"?"bn":"en";
  $("langToggle").textContent=t("toggle");
  $("appTitle").textContent=t("appTitle"); $("appSubtitle").textContent=t("appSubtitle"); $("heroTitle").textContent=t("heroTitle"); $("heroText").textContent=t("heroText");
  $("autoMatchBtn").textContent=t("autoMatch"); $("saveBtn").textContent=state.lang==="bn"?"কাজ সেভ করুন":"Save work"; $("restoreBtn").textContent=state.lang==="bn"?"সেভ খোলুন":"Reopen saved";
  $("requirementsHeading").textContent=t("requirements"); $("loadRequirementsLabel").textContent=t("load"); $("demoRequirementsBtn").textContent=t("demo");
  $("requirementsEmptyTitle").textContent=t("emptyReqTitle"); $("requirementsEmptyText").textContent=t("emptyReqText"); $("requirementsLoadedLabel").textContent=t("loaded"); $("requirementsHint").textContent=t("reqHint"); $("requirementsAutoBtn").textContent=t("autoAll");
  $("uploadHeading").textContent=t("upload"); $("dropTitle").textContent=t("dropTitle"); $("dropText").textContent=t("dropText"); $("fileSearch").placeholder=t("searchFiles"); $("fileSearch").setAttribute("aria-label",t("searchFiles")); $("duplicateHelp").textContent=t("duplicateHelp");
  $("checkHeading").textContent=t("match"); $("checkEmptyTitle").textContent=t("checkEmpty"); $("bonusHeading").textContent=t("bonus"); $("csvTitle").textContent=t("csvTitle"); $("csvText").textContent=t("csvText"); $("csvBtn").textContent=t("exportCsv");
  $("signatureTitle").textContent=t("signatureTitle"); $("signatureText").textContent=t("signatureText"); $("signatureUploadLabel").textContent=t("uploadPng"); $("previewTitle").textContent=t("previewTitle"); $("previewText").textContent=t("previewText"); $("previewHint").textContent=t("previewHint");
  $("packageHeading").textContent=t("package"); $("indexOption").textContent=t("indexOption"); $("signatureOption").textContent=t("signatureOption"); $("generateBtn").textContent=t("generate"); $("privacyNote").textContent=t("localOnly");
  $("localPill").textContent=t("local");
  renderAll();
}

function openDb(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{ if(!req.result.objectStoreNames.contains(DB_STORE)) req.result.createObjectStore(DB_STORE); };
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
}
async function saveProject(){
  if(!state.requirements){ setMessage($("uploadMessage"),t("loadReqFirst"),"error"); return; }
  const db=await openDb();
  const payload={
    savedAt:new Date().toISOString(),
    requirements:state.requirements,
    matches:[...state.matches], expiry:[...state.expiry], signaturePages:[...state.signaturePages],
    signature:state.signature?{name:state.signature.name,type:state.signature.type,bytes:state.signature.bytes}:null,
    files:state.files.map(f=>({id:f.id,name:f.file.name,type:f.file.type,size:f.file.size,lastModified:f.file.lastModified,bytes:f.bytes}))
  };
  await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,"readwrite"); tx.objectStore(DB_STORE).put(payload,"current"); tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);});
  db.close(); setMessage($("uploadMessage"),t("saved"),"success");
}
async function restoreProject(){
  const db=await openDb();
  const payload=await new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,"readonly"); const q=tx.objectStore(DB_STORE).get("current"); q.onsuccess=()=>resolve(q.result); q.onerror=()=>reject(q.error);});
  db.close();
  if(!payload){ setMessage($("uploadMessage"),t("nothingSaved"),"error"); return; }
  state.requirements=payload.requirements;
  state.matches=new Map(payload.matches||[]); state.expiry=new Map(payload.expiry||[]); state.signaturePages=new Map(payload.signaturePages||[]);
  state.files=(payload.files||[]).map(f=>({id:f.id,file:new File([f.bytes],f.name,{type:f.type,lastModified:f.lastModified}),bytes:f.bytes,pages:0,hash:""}));
  for(const f of state.files){
    try{ const pdf=await pdfjsLib.getDocument({data:f.bytes}).promise; f.pages=pdf.numPages; f.hash=await hashBuffer(f.bytes); }catch{}
  }
  if(payload.signature) state.signature={name:payload.signature.name,type:payload.signature.type,bytes:payload.signature.bytes};
  renderAll(); setMessage($("uploadMessage"),`${t("restored")}${payload.savedAt?` · ${t("savedAt")} ${new Date(payload.savedAt).toLocaleString()}`:""}`,"success");
}

function exportCsv(){
  if(!state.requirements) return;
  const rows=[[t("order"),t("document"),t("filename"),t("pages"),t("expiry"),t("status")]];
  for(const req of state.requirements.requirements){
    const f=state.files.find(x=>x.id===state.matches.get(req.id)), s=statusFor(req);
    rows.push([req.order,titleFor(req),f?.file.name||"",f?.pages||"",state.expiry.get(req.id)||"",s.label]);
  }
  const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download=`${state.requirements.tender.tender_id}_Checklist.csv`; a.click(); URL.revokeObjectURL(a.href);
  setMessage($("uploadMessage"),t("exportDone"),"success");
}

async function previewFile(id){
  const f=state.files.find(x=>x.id===id); if(!f) return;
  $("modal").classList.remove("hidden"); $("modalTitle").textContent=f.file.name; $("previewPageLabel").textContent=`${t("page")} 1 / ${f.pages}`;
  state.preview={fileId:id,pdf:null,page:1,loading:true};
  try{ state.preview.pdf=await pdfjsLib.getDocument({data:f.bytes}).promise; await renderPreviewPage(); } catch { closePreview(); setMessage($("uploadMessage"),t("pdfBad"),"error"); }
}
async function renderPreviewPage(){
  const pdf=state.preview.pdf, p=await pdf.getPage(state.preview.page), canvas=$("previewCanvas"), viewport=p.getViewport({scale:1.35});
  canvas.width=viewport.width; canvas.height=viewport.height;
  await p.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
  $("previewPageLabel").textContent=`${t("page")} ${state.preview.page} / ${pdf.numPages}`;
}
function closePreview(){ $("modal").classList.add("hidden"); state.preview={fileId:null,pdf:null,page:1,loading:false}; }

function loadSignature(file){
  if(!file) return;
  if(file.type!=="image/png"){ setMessage($("uploadMessage"),t("signatureNone"),"error"); return; }
  file.arrayBuffer().then(bytes=>{state.signature={name:file.name,type:file.type,bytes}; $("signatureState").textContent=`${t("signatureAdded")} · ${file.name}`; $("applySignature").checked=true; renderAll();});
}

function parsePages(text,max){
  return [...new Set(String(text||"").split(",").map(x=>Number(x.trim())).filter(n=>Number.isInteger(n)&&n>=1&&n<=max))].sort((a,b)=>a-b);
}

async function createPackage(){
  if(!state.requirements || blockingList().length || state.processing) return;
  state.processing=true; updateDashboard(); clearMessage($("packageMessage"));
  try{
    const out=await PDFDocument.create();
    const helvetica=await out.embedFont(StandardFonts.Helvetica), bold=await out.embedFont(StandardFonts.HelveticaBold);
    const tender=state.requirements.tender, included=state.requirements.requirements.filter(r=>state.matches.has(r.id)).sort((a,b)=>a.order-b.order);
    const coverW=595, coverH=842;
    const cover=out.addPage([coverW,coverH]);
    cover.drawText("TENDER DOCUMENT PACKAGE",{x:42,y:780,size:19,font:bold,color:rgb(.08,.16,.35)});
    cover.drawText(tender.tender_id,{x:42,y:750,size:13,font:bold});
    const fields=[["Tender title",tender.title],["Procuring entity",tender.procuring_entity],["Bidder",tender.bidder],["Submission deadline",tender.submission_deadline],["Package made",fmtDate(new Date())]];
    let y=712;
    for(const [label,value] of fields){ cover.drawText(`${label}:`,{x:42,y,size:10,font:bold,color:rgb(.25,.32,.42)}); cover.drawText(String(value),{x:155,y,size:10,font:helvetica}); y-=25; }
    cover.drawText("Included documents",{x:42,y:y-10,size:12,font:bold}); y-=34;
    included.forEach(r=>{const f=state.files.find(x=>x.id===state.matches.get(r.id)); const label=`${r.order}. ${r.title_en}${f?` — ${f.file.name}`:""}`; cover.drawText(label.slice(0,95),{x:50,y,size:9.5,font:helvetica}); y-=18;});
    cover.drawText("Generated by Tender Package Builder",{x:42,y:45,size:8.5,font:helvetica,color:rgb(.42,.47,.55)});

    const indexEnabled=$("includeIndex").checked;
    let indexPages=[];
    if(indexEnabled){
      const pagesNeeded=Math.max(1,Math.ceil(included.length/26));
      for(let i=0;i<pagesNeeded;i++){
        const pg=out.addPage([coverW,coverH]); indexPages.push(pg);
        pg.drawText("DOCUMENT INDEX",{x:42,y:790,size:18,font:bold,color:rgb(.08,.16,.35)});
        pg.drawText(tender.tender_id,{x:42,y:766,size:10,font:helvetica,color:rgb(.35,.4,.48)});
      }
    }

    const sourcePageMap=new Map();
    const importedInfo=[];
    for(const r of included){
      const f=state.files.find(x=>x.id===state.matches.get(r.id));
      const src=await PDFDocument.load(f.bytes,{ignoreEncryption:false});
      const start=out.getPageCount()+1;
      const signPages=parsePages(state.signaturePages.get(r.id),src.getPageCount());
      let pageNo=0;
      for(const srcPage of src.getPages()){
        pageNo++;
        const sw=srcPage.getWidth(), sh=srcPage.getHeight(), footerBand=Math.min(28,sh*.08);
        const page=out.addPage([sw,sh]);
        const embedded=await out.embedPage(srcPage);
        const scale=Math.min(1,(sh-footerBand)/sh), dw=sw*scale, dh=sh*scale;
        page.drawPage(embedded,{x:(sw-dw)/2,y:footerBand+(sh-footerBand-dh)/2,width:dw,height:dh});
        const finalPageNumber=out.getPageCount();
        sourcePageMap.set(finalPageNumber,{reqId:r.id,sourcePage:pageNo});
        if($("applySignature").checked && state.signature && signPages.includes(pageNo)){
          const png=await out.embedPng(state.signature.bytes);
          const targetW=Math.min(90,sw*.20), scaleS=targetW/png.width, targetH=png.height*scaleS;
          page.drawImage(png,{x:sw-targetW-18,y:footerBand+5,width:targetW,height:targetH,opacity:.92});
        }
      }
      importedInfo.push({req:r,start,pageCount:src.getPageCount()});
    }

    if(indexEnabled){
      importedInfo.forEach((entry,i)=>{
        const pageIndex=Math.floor(i/26), row=i%26, pg=indexPages[pageIndex], yy=730-row*24;
        pg.drawText(`${entry.req.order}. ${entry.req.title_en}`.slice(0,78),{x:46,y:yy,size:10,font:helvetica});
        pg.drawText(`Page ${entry.start}`,{x:420,y:yy,size:10,font:bold});
      });
    }

    const total=out.getPageCount();
    out.getPages().forEach((p,i)=>{
      const w=p.getWidth(), footerH=Math.min(24,p.getHeight()*.06);
      p.drawRectangle({x:0,y:0,width:w,height:footerH,color:rgb(1,1,1),opacity:1});
      p.drawText(`${tender.tender_id} | Page ${i+1} of ${total}`,{x:8,y:Math.max(5,footerH-15),size:8.5,font:bold,color:rgb(.18,.22,.30)});
    });

    const bytes=await out.save(), url=URL.createObjectURL(new Blob([bytes],{type:"application/pdf"}));
    const a=document.createElement("a"); a.href=url; a.download=`${tender.tender_id}_Package.pdf`; a.className="button primary"; a.textContent=`${t("generatedFile")} · ${tender.tender_id}_Package.pdf`;
    const box=$("packageMessage"); box.className="message success"; box.innerHTML=`${escapeHtml(t("packageReady"))}<br>`; box.appendChild(a); box.classList.remove("hidden");
  }catch(err){ console.error(err); setMessage($("packageMessage"),t("packageFail"),"error"); }
  finally{ state.processing=false; updateDashboard(); }
}

$("requirementsFile").addEventListener("change",async e=>{ const f=e.target.files[0]; if(!f)return; try{setRequirements(JSON.parse(await f.text()));}catch{setMessage($("uploadMessage"),t("invalidReq"),"error");} });
$("demoRequirementsBtn").addEventListener("click",()=>setRequirements(demoRequirements));
$("langToggle").addEventListener("click",switchLanguage);
$("pdfFiles").addEventListener("change",e=>addFiles(e.target.files));
$("fileSearch").addEventListener("input",renderFiles);
$("autoMatchBtn").addEventListener("click",autoMatchAll);
$("requirementsAutoBtn").addEventListener("click",autoMatchAll);
$("saveBtn").addEventListener("click",saveProject);
$("restoreBtn").addEventListener("click",restoreProject);
$("csvBtn").addEventListener("click",exportCsv);
$("signatureFile").addEventListener("change",e=>loadSignature(e.target.files[0]));
$("applySignature").addEventListener("change",renderAll);
$("includeIndex").addEventListener("change",renderAll);
$("generateBtn").addEventListener("click",createPackage);
$("modalClose").addEventListener("click",closePreview);
$("modal").addEventListener("click",e=>{if(e.target.id==="modal")closePreview();});
$("prevPage").addEventListener("click",async()=>{if(state.preview.pdf&&state.preview.page>1){state.preview.page--;await renderPreviewPage();}});
$("nextPage").addEventListener("click",async()=>{if(state.preview.pdf&&state.preview.page<state.preview.pdf.numPages){state.preview.page++;await renderPreviewPage();}});

const dz=$("dropzone");
["dragenter","dragover"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.add("dragover")}));
["dragleave","drop"].forEach(ev=>dz.addEventListener(ev,e=>{e.preventDefault();dz.classList.remove("dragover")}));
dz.addEventListener("drop",e=>addFiles(e.dataTransfer.files));

$("filesList").addEventListener("click",e=>{
  const preview=e.target.closest("[data-preview-file]"); if(preview){previewFile(preview.dataset.previewFile);return;}
  const remove=e.target.closest("[data-remove-file]"); if(!remove)return;
  const id=remove.dataset.removeFile; state.files=state.files.filter(f=>f.id!==id);
  for(const [rid,fid] of state.matches.entries()) if(fid===id){state.matches.delete(rid);state.expiry.delete(rid);state.signaturePages.delete(rid);}
  renderAll();
});

$("checklist").addEventListener("change",e=>{
  if(e.target.matches("[data-match]")) applyMatch(e.target.dataset.match,e.target.value);
  if(e.target.matches("[data-expiry]")){state.expiry.set(e.target.dataset.expiry,e.target.value);renderAll();}
  if(e.target.matches("[data-signpages]")){state.signaturePages.set(e.target.dataset.signpages,e.target.value);renderAll();}
});

switchLanguage();
