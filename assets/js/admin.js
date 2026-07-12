import { supabase } from './supabase.js';

const layoutStyles = document.createElement('style');
layoutStyles.textContent = `
  html, body { min-height: 100%; overflow-x: hidden; }
  /* Fixed header that overlays content so opening the menu doesn't shift layout */
  header.site-header { position: fixed; top: 0; left: 0; right: 0; z-index: 60; transition: transform .25s ease, opacity .25s ease, background-color .25s ease; }
  header.site-header.header-hidden { transform: translateY(-100%); opacity: 0.96; }
  /* Overlay shown when mobile nav is open - transparent glass effect */
  .nav-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.42); backdrop-filter: blur(6px); opacity: 0; pointer-events: none; transition: opacity .2s ease; z-index: 50; }
  .nav-overlay.visible { opacity: 1; pointer-events: auto; }
  /* Ensure page content is pushed down by the fixed header so it doesn't appear underneath */
  body > main { width: 100%; max-width: none !important; padding-top: var(--header-height, 72px); }
  #stat-cards { width: 100%; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)) !important; }
  #stat-cards > article { min-width: 0; }
  #student-index { min-width: 0; }
  #student-index .overflow-x-auto { max-width: 100%; }
  /* Mobile nav becomes a fixed overlay panel beneath the header so it doesn't push content */
  #admin-nav { position: fixed; left: 0; right: 0; top: calc(var(--header-height, 64px)); display: block; flex-direction: column; overflow: auto; max-height: 0; opacity: 0; transform: translateY(-0.75rem); transition: max-height .28s ease, opacity .28s ease, transform .28s ease; pointer-events: none; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); backdrop-filter: none; border-bottom: 1px solid rgba(255,255,255,0.04); }
  #admin-nav.mobile-open { max-height: calc(100vh - var(--header-height, 64px)); opacity: 1; transform: translateY(0); pointer-events: auto; }
  #admin-nav.mobile-open a, #admin-nav.mobile-open button.mobile-nav-link { display: block; width: 100%; padding: 0.9rem 1rem; border-radius: 0.75rem; transition: background-color .2s ease, color .2s ease; }
  #admin-nav.mobile-open a { margin-bottom: 0; background: rgba(255, 255, 255, 0.08); }
  #admin-nav.mobile-open button.mobile-nav-link { text-align: left; }
  #admin-nav a:hover, #admin-nav button.mobile-nav-link:hover, header.site-header button:hover, header.site-header a:hover { background: rgba(255,255,255,0.14); }
  .header-signout:hover { background: rgba(255,255,255,0.12); }
  body > header nav { overflow-x: hidden !important; }
  /* Desktop: restore nav to normal flow inside header */
  @media (min-width: 1024px) {
    /* Desktop: keep header fixed but ensure nav is inline and horizontal */
    header.site-header { position: fixed; }
    #admin-nav { position: static; max-height: none; opacity: 1; transform: none; pointer-events: auto; display: flex !important; flex-direction: row; align-items: center; gap: 1.25rem; background: transparent; border-bottom: none; }
    #admin-nav a, #admin-nav button.mobile-nav-link { display: inline-block; margin-bottom: 0; }
    .nav-overlay { display: none !important; }
    /* Reduce header padding on larger screens to keep it compact */
    header.site-header > div { padding-top: 0.75rem; padding-bottom: 0.75rem; }
  }
  @media (min-width: 1536px) { body > main { padding-left: 4rem !important; padding-right: 4rem !important; } }
  @media (max-width: 1280px) { #stat-cards { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; } }
  @media (max-width: 1024px) { #stat-cards { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }
  @media (max-width: 640px) { body > main { padding-left: 1rem !important; padding-right: 1rem !important; } #stat-cards { grid-template-columns: repeat(1, minmax(0, 1fr)) !important; } }
  /* Mobile polish: tighter header and responsive action layout */
  @media (max-width: 640px) {
    header.site-header > div { padding-top: 0.45rem; padding-bottom: 0.45rem; }
    header.site-header .grid { height: 2rem !important; width: 2rem !important; }
    header.site-header .grid { font-size: 0.7rem !important; }
    header.site-header a span { line-height: 1; }
    /* Make sure main keeps a small top-gap for compact headers */
    body > main { padding-top: calc(var(--header-height, 56px) + 0.25rem); }
    /* Mobile nav panel spacing */
    #admin-nav.mobile-open { padding: 0.75rem 1rem; }
    /* Ensure action buttons wrap and don't overflow */
    .action-row, .actions { display: flex; gap: 0.5rem; flex-wrap: wrap; align-items: center; }
    .action-row .btn, .actions .btn { flex: 1 1 auto; min-width: 120px; }
  }
  /* Mobile: show two stat cards per row for better density */
  @media (max-width: 640px) {
    #stat-cards { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 0.75rem; }
    #stat-cards > article { padding: 1rem; }
  }

  /* Card style: dark cream background instead of white */
  #stat-cards > article { background: #F7EFE0; border: 1px solid rgba(0,0,0,0.03); }

  /* Desktop header: force single-row header with nav inline */
  @media (min-width: 1024px) {
    header.site-header { display: flex; align-items: center; }
    header.site-header > div { flex: 1; display: flex; align-items: center; justify-content: space-between; }
    #admin-nav { margin-left: 1rem; }
  }
`;
document.head.append(layoutStyles);

// Fix common mojibake sequences that can appear when files are saved with the wrong encoding.
function fixBrokenEntities() {
  const replacements = [
    [/â†’/g, '→'],
    [/â†/g, '←'],
    [/â€¦/g, '…'],
    [/â€”/g, '—']
  ];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    let text = node.nodeValue;
    if (!text) return;
    let replaced = text;
    replacements.forEach(([re, val]) => { replaced = replaced.replace(re, val); });
    if (replaced !== text) node.nodeValue = replaced;
  });
}
window.addEventListener('DOMContentLoaded', fixBrokenEntities, { once: true });

let students = []; let documentsByStudent = new Map();
const errorBox = document.querySelector('#admin-error');
const table = document.querySelector('#students-table');
let adminNav = document.querySelector('#admin-nav');
let adminMenuToggle = document.querySelector('#admin-menu-toggle');
const searchInput = document.querySelector('#search');
const statusFilter = document.querySelector('#status-filter');
let header = document.querySelector('header.site-header');
const isAdminDashboard = Boolean(table || document.querySelector('#recent-applications') || document.querySelector('#stat-cards'));
const statuses = ['pending', 'approved', 'active', 'completed', 'rejected'];
const escapeHtml = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const label = (value) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());
function showError(message) { if (errorBox) { errorBox.textContent = message; errorBox.classList.remove('hidden'); } else { console.error(message); } }
function documentState(studentId) { const document = documentsByStudent.get(studentId)?.find((item) => item.document_type === 'application_letter'); return document?.review_status ?? 'missing'; }
function badgeClass(status) { return ({ pending:'bg-amber-100 text-amber-800', approved:'bg-emerald-100 text-emerald-800', rejected:'bg-red-100 text-red-800', active:'bg-blue-100 text-blue-800', completed:'bg-slate-200 text-slate-700', missing:'bg-red-100 text-red-800' }[status] ?? 'bg-slate-100 text-slate-700'); }
function renderRecent() { const root=document.querySelector('#recent-applications'); root.innerHTML=students.slice(0,5).map((student)=>`<a href="student-details.html?id=${student.id}" class="flex items-center justify-between gap-4 py-3 hover:bg-slate-50"><span><span class="block font-semibold">${escapeHtml(student.full_name)}</span><span class="block text-sm text-slate-500">${escapeHtml(student.institution||'Institution not provided')}</span></span><span class="rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass(student.status)}">${label(student.status)}</span></a>`).join('') || '<p class="py-4 text-sm text-slate-500">No applications yet.</p>'; }

// If pages don't include the full admin header, inject it so the hamburger and nav work everywhere.
function ensureHeaderInjected(){
  if (header) return;
  const headerHtml = `
  <header class="site-header border-b border-emerald-900 bg-county-green text-white">
    <div class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
      <a href="../index.html" class="flex items-center gap-3"><span class="grid h-10 w-10 place-items-center rounded-full bg-white text-xs font-bold text-county-green">NC</span><span><span class="block font-bold">Narok County</span><span class="block text-xs text-emerald-100">Attachment Management System</span></span></a>
      <div class="flex items-center gap-3">
        <button id="admin-menu-toggle" aria-expanded="false" aria-controls="admin-nav" class="lg:hidden rounded-md border border-white/30 px-3 py-2 text-sm font-semibold hover:bg-white/10">☰ Menu</button>
        <button data-sign-out class="header-signout hidden lg:inline-flex rounded-md border border-white/30 px-3 py-2 text-sm font-semibold hover:bg-white/10">Sign out</button>
      </div>
    </div>
    <nav id="admin-nav" class="hidden lg:flex mx-auto max-w-7xl gap-6 overflow-x-auto px-4 text-sm font-semibold">
      <a class="border-b-2 border-county-gold py-3" href="admin-dashboard.html">Dashboard</a>
      <a class="py-3 text-emerald-100 hover:text-white" href="document-reviews.html">Document reviews</a>
      <a class="py-3 text-emerald-100 hover:text-white" href="reports.html">Reports</a>
      <a class="py-3 text-emerald-100 hover:text-white" href="settings.html">Settings</a>
    </nav>
  </header>`;
  document.body.insertAdjacentHTML('afterbegin', headerHtml);
  header = document.querySelector('header.site-header');
  adminNav = document.querySelector('#admin-nav');
  adminMenuToggle = document.querySelector('#admin-menu-toggle');
  // Add a mobile-only sign out link inside the nav to avoid duplicate sign-outs on desktop
  if (adminNav && !adminNav.querySelector('[data-mobile-signout]')) {
    const addMobileSignOut = () => {
      // only add for small viewports
      if (window.innerWidth < 1024) {
        const mobileSign = document.createElement('a');
        mobileSign.setAttribute('data-mobile-signout', '1');
        mobileSign.setAttribute('data-sign-out', '');
        mobileSign.className = 'mobile-nav-link rounded-md border border-white/30 px-4 py-3 text-left text-sm font-semibold text-white hover:bg-white/10';
        mobileSign.textContent = 'Sign out';
        adminNav.appendChild(mobileSign);
        mobileSign.addEventListener('click', async () => { await supabase.auth.signOut(); location.assign('../index.html'); });
      } else {
        const existing = adminNav.querySelector('[data-mobile-signout]');
        if (existing) existing.remove();
      }
    };
    addMobileSignOut();
    window.addEventListener('resize', addMobileSignOut);
  }
}
// Create overlay element for mobile nav if missing
let navOverlay = document.querySelector('.nav-overlay');
function ensureOverlay(){
  if (navOverlay) return;
  navOverlay = document.createElement('div');
  navOverlay.className = 'nav-overlay';
  document.body.appendChild(navOverlay);
}
ensureOverlay();
// Keep a CSS variable with the header height so overlays can position correctly
function refreshHeaderHeight(){
  if (!header) return;
  const h = Math.ceil(header.getBoundingClientRect().height) || 64;
  document.documentElement.style.setProperty('--header-height', `${h}px`);
}
window.addEventListener('resize', refreshHeaderHeight);
window.addEventListener('DOMContentLoaded', refreshHeaderHeight, { once: true });
refreshHeaderHeight();

  // Ensure only one sign-out is visible on desktop, and mobile shows the sign-out inside the nav.
  function normalizeSignOuts() {
    const desktop = window.innerWidth >= 1024;
    const headerSign = document.querySelector('.header-signout');
    // collect all sign-out elements
    const signs = Array.from(document.querySelectorAll('[data-sign-out]'));
    signs.forEach(el => {
      if (desktop) {
        // only keep the header-signout visible
        if (el.classList && el.classList.contains('header-signout')) {
          el.classList.remove('hidden');
          el.style.display = '';
        } else {
          el.classList.add('hidden');
        }
      } else {
        // mobile: hide header signout and show signouts in nav
        if (el.classList && el.classList.contains('header-signout')) {
          el.classList.add('hidden');
        } else {
          el.classList.remove('hidden');
          el.style.display = '';
        }
      }
    });
  }
  window.addEventListener('resize', normalizeSignOuts);
  window.addEventListener('DOMContentLoaded', normalizeSignOuts, { once: true });

  // As a stronger measure, remove extra sign-out elements entirely so duplicates can't appear.
  function dedupeSignOuts() {
    const signs = Array.from(document.querySelectorAll('[data-sign-out]'));
    if (signs.length <= 1) return;
    const headerSign = document.querySelector('.header-signout');
    const keeper = headerSign || signs[0];
    signs.forEach(s => {
      if (s !== keeper) {
        s.remove();
      }
    });
  }
  window.addEventListener('DOMContentLoaded', dedupeSignOuts, { once: true });
  // also run after header injection in case pages had their own sign-outs
  dedupeSignOuts();
function renderStudents() { const query=document.querySelector('#search').value.toLowerCase().trim(), filter=document.querySelector('#status-filter').value; const rows=students.filter((student)=>{const values=[student.full_name,student.email,student.phone,student.national_id,student.institution,student.course].join(' ').toLowerCase();return (!filter||student.status===filter)&&(!query||values.includes(query));}); table.innerHTML=rows.length?rows.map((student)=>{const docStatus=documentState(student.id);return `<tr class="cursor-pointer hover:bg-emerald-50/50" data-open="${student.id}"><td class="p-4"><div class="flex items-center gap-3"><span class="grid h-9 w-9 place-items-center rounded-full bg-emerald-100 text-xs font-bold text-county-green">${escapeHtml(student.full_name.split(' ').map(x=>x[0]).slice(0,2).join(''))}</span><span><span class="block font-semibold">${escapeHtml(student.full_name)}</span><span class="block text-xs text-slate-500">${escapeHtml(student.email)}</span></span></div></td><td class="p-4"><span class="block font-medium">${escapeHtml(student.institution||'—')}</span><span class="block text-xs text-slate-500">${escapeHtml(student.course||'Course not provided')}</span></td><td class="p-4"><span class="rounded-full px-2.5 py-1 text-xs font-bold ${badgeClass(docStatus)}">${docStatus==='missing'?'Missing':label(docStatus)}</span></td><td class="p-4"><select data-status="${student.id}" class="rounded-md border border-slate-300 bg-white p-2 text-xs">${statuses.map(s=>`<option value="${s}" ${student.status===s?'selected':''}>${label(s)}</option>`).join('')}</select></td><td class="p-4 text-slate-600">${new Date(student.created_at).toLocaleDateString()}</td><td class="p-4"><a href="student-details.html?id=${student.id}" class="font-bold text-county-green hover:underline">View profile</a></td></tr>`}).join(''):'<tr><td colspan="6" class="p-8 text-center text-slate-500">No students match these filters.</td></tr>'; table.querySelectorAll('[data-open]').forEach(row=>row.addEventListener('click',(event)=>{if(event.target.closest('select,a'))return;location.assign(`student-details.html?id=${row.dataset.open}`)})); table.querySelectorAll('[data-status]').forEach(select=>select.addEventListener('change',async()=>{const student=students.find(x=>x.id===select.dataset.status);const {error}=await supabase.from('profiles').update({status:select.value}).eq('id',student.id);if(error){showError('Could not update the application status.');select.value=student.status;return}student.status=select.value;renderStats();renderRecent()})); }
function renderStats() { document.querySelector('#total-count').textContent=students.length; statuses.forEach(status=>{const target=document.querySelector(`#${status}-count`);if(target)target.textContent=students.filter(s=>s.status===status).length}); document.querySelector('#documents-count').textContent=[...documentsByStudent.values()].flat().filter(d=>d.review_status==='pending').length; }
async function init(){const {data:{user}}=await supabase.auth.getUser();if(!user){location.replace('../login.html');return}const {data:staff,error:staffError}=await supabase.from('profiles').select('role').eq('id',user.id).single();if(staffError||!['hr_admin','super_admin'].includes(staff?.role)){location.replace('dashboard.html');return}
  if (isAdminDashboard) {
    const [profiles,documents]=await Promise.all([supabase.from('profiles').select('id,full_name,email,phone,national_id,institution,course,status,created_at').eq('role','student').order('created_at',{ascending:false}),supabase.from('documents').select('student_id,document_type,review_status')]);
    if(profiles.error||documents.error){showError('Unable to load dashboard data.');return}
    students=profiles.data;documentsByStudent=new Map();documents.data.forEach(d=>documentsByStudent.set(d.student_id,[...(documentsByStudent.get(d.student_id)||[]),d]));renderStats();renderRecent();renderStudents();
  }
}
if (searchInput) searchInput.addEventListener('input', renderStudents);
if (statusFilter) statusFilter.addEventListener('change', renderStudents);
// Ensure header/nav exist on pages that didn't include them, then wire up menu behavior.
ensureHeaderInjected();
if (adminMenuToggle && adminNav) {
  const updateNavVisibility = () => {
    const desktop = window.innerWidth >= 1024;
    adminNav.classList.toggle('hidden', !desktop && !adminNav.classList.contains('mobile-open'));
    if (desktop) {
      adminNav.classList.remove('mobile-open');
    }
    adminMenuToggle.setAttribute('aria-expanded', desktop ? 'false' : String(adminNav.classList.contains('mobile-open')));
  };

  adminMenuToggle.addEventListener('click', () => {
    const isOpen = adminNav.classList.toggle('mobile-open');
    adminNav.classList.toggle('hidden', !isOpen);
    adminMenuToggle.setAttribute('aria-expanded', String(isOpen));
    // show overlay and prevent background scroll when open
    if (isOpen) {
      ensureOverlay();
      navOverlay.classList.add('visible');
      document.documentElement.style.overflow = 'hidden';
      // ensure header visible
      header.classList.remove('header-hidden');
      // refresh header height because opening the menu may change header dimensions
      refreshHeaderHeight();
    } else {
      navOverlay.classList.remove('visible');
      document.documentElement.style.overflow = '';
    }
  });

  adminNav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    if (window.innerWidth < 1024) {
      adminNav.classList.add('hidden');
      adminNav.classList.remove('mobile-open');
      adminMenuToggle.setAttribute('aria-expanded', 'false');
      if (navOverlay) navOverlay.classList.remove('visible');
      document.documentElement.style.overflow = '';
    }
  }));

// Clicking the overlay closes the mobile nav
if (navOverlay) {
  navOverlay.addEventListener('click', () => {
    adminNav.classList.remove('mobile-open');
    adminNav.classList.add('hidden');
    navOverlay.classList.remove('visible');
    adminMenuToggle.setAttribute('aria-expanded', 'false');
    document.documentElement.style.overflow = '';
  });
}

  window.addEventListener('resize', updateNavVisibility);
  updateNavVisibility();
  // No hide-on-scroll behavior: keep header fixed and visible at all times.
  refreshHeaderHeight();
}
document.querySelectorAll('[data-sign-out]').forEach(button=>button.addEventListener('click',async()=>{await supabase.auth.signOut();location.assign('../index.html')}));
init().catch(()=>showError('Unable to reach Supabase. Check the connection and try again.'));
