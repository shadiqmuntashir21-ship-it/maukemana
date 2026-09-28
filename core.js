const SUPABASE_URL='https://lbrrgjcolodpxcicrxnq.supabase.co';
const SUPABASE_KEY='sb_publishable_zcnNT5tRRwSDhDwlshpn2A_3aHzmsam';
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
const app=document.querySelector('#app');
const modalRoot=document.querySelector('#modal-root');
const toastRoot=document.querySelector('#toast-root');
const state={
  stages:[],domains:[],topics:[],videos:[],topicVideos:[],interests:[],interestTopics:[],
  session:null,profile:null,saves:new Set(),progress:{},reflections:{},userInterests:new Set(),isAdmin:false,
  selectedStage:localStorage.getItem('mk_stage')||'',selectedInterests:new Set(JSON.parse(localStorage.getItem('mk_interests')||'[]')),
  exploreQuery:'',exploreDomain:'all',exploreStage:'current',adminTab:'topics',loading:true,error:''
};
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[c]));
const route=()=>location.hash.replace(/^#/,'')||'home';
const topicById=id=>state.topics.find(x=>x.id===id);
const stageById=id=>state.stages.find(x=>x.id===id);
const domainById=id=>state.domains.find(x=>x.id===id);
const videoById=id=>state.videos.find(x=>x.id===id);
const currentStage=()=>stageById(state.selectedStage)||state.stages[3]||state.stages[0];
const currentStageTopics=()=>state.topics.filter(t=>t.stage_id===currentStage()?.id).sort((a,b)=>a.sort_order-b.sort_order);
const initials=()=>state.session?.user?.email?.slice(0,2).toUpperCase()||'MK';
function toast(message,type=''){const el=document.createElement('div');el.className=`toast ${type}`;el.textContent=message;toastRoot.appendChild(el);setTimeout(()=>el.remove(),2600)}
function go(hash){location.hash=hash;window.scrollTo({top:0,behavior:'smooth'})}
function progressLabel(status){return status==='tried'?'Sudah dicoba':status==='watched'?'Sudah ditonton':'Sedang dieksplorasi'}
function progressClass(status){return status==='tried'?'p-tried':status==='watched'?'p-watched':'p-exploring'}
function formatDuration(sec){if(!sec)return '';const m=Math.floor(sec/60);return `${m} menit`}
async function loadCatalog(){
  const [stages,domains,topics,videos,topicVideos,interests,interestTopics]=await Promise.all([
    db.from('stages').select('*').order('sort_order'),db.from('domains').select('*').order('name'),
    db.from('topics').select('*').order('sort_order'),db.from('videos').select('*').order('created_at'),
    db.from('topic_videos').select('*').order('sort_order'),db.from('interests').select('*').order('sort_order'),
    db.from('interest_topics').select('*').order('sort_order')
  ]);
  const errors=[stages,domains,topics,videos,topicVideos,interests,interestTopics].map(x=>x.error).filter(Boolean);if(errors.length)throw errors[0];
  Object.assign(state,{stages:stages.data||[],domains:domains.data||[],topics:topics.data||[],videos:videos.data||[],topicVideos:topicVideos.data||[],interests:interests.data||[],interestTopics:interestTopics.data||[]});
  if(!state.selectedStage&&state.stages.length)state.selectedStage=state.stages.find(s=>s.id==='s1-1')?.id||state.stages[0].id;
}
async function loadUser(){
  if(!state.session){state.profile=null;state.saves=new Set();state.progress={};state.reflections={};state.userInterests=new Set();state.isAdmin=false;return}
  const uid=state.session.user.id;
  const [profile,saves,progress,reflections,userInterests,admin]=await Promise.all([
    db.from('profiles').select('*').eq('id',uid).maybeSingle(),db.from('saved_topics').select('topic_id').eq('user_id',uid),
    db.from('topic_progress').select('topic_id,status').eq('user_id',uid),db.from('reflections').select('topic_id,body,created_at').eq('user_id',uid).order('created_at',{ascending:false}),
    db.from('user_interests').select('interest_id').eq('user_id',uid),db.from('admin_members').select('user_id').eq('user_id',uid).maybeSingle()
  ]);
  state.profile=profile.data||null;state.saves=new Set((saves.data||[]).map(x=>x.topic_id));state.progress=Object.fromEntries((progress.data||[]).map(x=>[x.topic_id,x.status]));
  state.reflections={};for(const x of reflections.data||[]){if(!state.reflections[x.topic_id])state.reflections[x.topic_id]=x.body}
  state.userInterests=new Set((userInterests.data||[]).map(x=>x.interest_id));state.isAdmin=!!admin.data;if(state.userInterests.size){state.selectedInterests=new Set(state.userInterests);localStorage.setItem('mk_interests',JSON.stringify([...state.selectedInterests]))}
  if(state.profile?.life_stage_id){state.selectedStage=state.profile.life_stage_id;localStorage.setItem('mk_stage',state.selectedStage)}
}
async function init(){
  try{
    const {data:{session}}=await db.auth.getSession();state.session=session;await loadCatalog();await loadUser();state.loading=false;render();
    if(!localStorage.getItem('mk_onboarded'))openOnboarding();
    db.auth.onAuthStateChange(async(_event,session)=>{state.session=session;await loadUser();render()});
    if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
  }catch(e){console.error(e);state.loading=false;state.error=e.message||'Tidak dapat memuat data';render()}
}
function shell(content,active='home'){
  const s=currentStage();
  return `<div class="app-shell"><header class="topbar"><div class="topbar-inner">
    <a class="brand" href="#home"><span class="brand-mark">MK</span><span>MauKeMana</span></a>
    <nav class="desktop-nav">${navLinks(active)}</nav><div class="topbar-actions">
      ${s?`<button class="phase-pill" data-action="onboarding"><i></i>${esc(s.short_label)} · ${esc(s.phase)}</button>`:''}
      ${state.session?`<button class="avatar-btn" data-go="profile">${esc(initials())}</button>`:`<button class="btn btn-dark btn-sm" data-action="auth">Masuk</button>`}
    </div></div></header>${state.error?`<div class="error-banner">${esc(state.error)}</div>`:''}${content}<nav class="bottom-nav">${navLinks(active,true)}</nav></div>`;
}
function navLinks(active,mobile=false){const links=[['home','Beranda'],['roadmap','Roadmap'],['explore','Explore'],['saved','Saved'],['profile','Profil']];return links.map(([id,label])=>`<a href="#${id}" class="${active===id?'active':''}">${label}</a>`).join('')}
function topicCard(t){const d=domainById(t.domain_id),s=stageById(t.stage_id),p=state.progress[t.id];return `<a href="#topic/${encodeURIComponent(t.id)}" class="card topic-card"><div class="topic-meta"><span class="chip chip-blue">${esc(d?.name||'Topik')}</span>${p?`<span class="chip chip-green">${esc(progressLabel(p))}</span>`:''}</div><h3>${esc(t.title)}</h3><p>${esc(t.short_description)}</p><div class="topic-card-foot"><span>${esc(s?.short_label||'')}</span><b>Mulai →</b></div></a>`}
function domainCard(d){return `<button class="domain-card" data-domain="${esc(d.id)}"><span class="domain-icon">${esc(d.name.slice(0,2).toUpperCase())}</span><b>${esc(d.name)}</b><small>${esc(d.description)}</small></button>`}
function renderHome(){
  const s=currentStage(),topics=currentStageTopics();const tried=topics.filter(t=>state.progress[t.id]==='tried').length;const next=topics.filter(t=>state.progress[t.id]!=='tried').slice(0,3);
  const interestTopics=state.selectedInterests.size?state.interestTopics.filter(x=>state.selectedInterests.has(x.interest_id)).map(x=>topicById(x.topic_id)).filter(Boolean).slice(0,3):[];
  const content=`<main class="page"><section class="hero"><div class="hero-copy"><span class="eyebrow">Tumbuh dengan arah</span>
    <h1>Kamu tidak harus tahu <em>semuanya.</em><br/>Cukup tahu langkah berikutnya.</h1>
    <p>MauKeMana menyusun pengembangan diri berdasarkan fase hidupmu. Bukan feed tanpa ujung, bukan motivasi sesaat—tetapi konteks, kurasi manusia, refleksi, lalu aksi kecil yang nyata.</p>
    <div class="hero-actions"><button class="btn btn-primary" data-go="roadmap">Lihat roadmap-ku →</button><button class="btn btn-white" data-action="onboarding">Ubah fase hidup</button></div></div>
    <aside class="hero-card"><div><span class="eyebrow">Fase kamu sekarang</span><div class="phase-number">${esc((s?.short_label||'01').replace(/\D+/g,'')||'01')}</div></div>
    <div class="phase-foot"><div><h3>${esc(s?.phase||'Mulai')}</h3><p>${esc(s?.tagline||'Pilih fase hidup untuk mulai.')}</p></div><small>${tried}/${topics.length}<br/>topik dicoba</small></div></aside></section>
    <section class="section"><div class="section-head"><div><span class="eyebrow">Langkah berikutnya</span><h2>Mulai dari yang relevan sekarang.</h2><p>Tiga topik terdekat dalam fase ${esc(s?.short_label||'kamu')}.</p></div><button class="btn btn-ghost" data-go="roadmap">Lihat semua →</button></div>
    <div class="grid grid-3">${next.length?next.map(topicCard).join(''):`<div class="empty" style="grid-column:1/-1"><div class="empty-icon">✓</div><h3>Fase ini sudah kamu jelajahi.</h3><p>Kamu bisa mengulang refleksi atau pindah ke fase berikutnya.</p></div>`}</div></section>
    ${interestTopics.length?`<section class="section"><div class="section-head"><div><span class="eyebrow">Sesuai minatmu</span><h2>Eksplorasi tambahan.</h2></div></div><div class="grid grid-3">${interestTopics.map(topicCard).join('')}</div></section>`:''}
    <section class="section"><div class="section-head"><div><span class="eyebrow">Sembilan area hidup</span><h2>Bukan hanya karier.</h2><p>Roadmap memandang pertumbuhan sebagai kombinasi kemampuan, cara berpikir, relasi, emosi, uang, dan kehidupan digital.</p></div></div><div class="domain-grid">${state.domains.map(domainCard).join('')}</div></section></main>`;
  return shell(content,'home')
}