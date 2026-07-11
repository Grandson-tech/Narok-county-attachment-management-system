import { supabase } from './supabase.js';

const studentId = new URLSearchParams(location.search).get('id');
const message = document.querySelector('#message');
const statuses = ['pending', 'approved', 'active', 'completed', 'rejected'];
const title = (value) => String(value ?? '').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value) => value ? new Date(value).toLocaleDateString() : '—';
const flash = (text, bad = false) => { message.className = `rounded-md border px-4 py-3 text-sm ${bad ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`; message.textContent = text; };

function renderTimeline(profile, documents) {
  const approvedDocument = documents.find((document) => document.review_status === 'approved');
  const entries = [
    ['Application submitted', profile.created_at, true],
    ['Document uploaded', documents[0]?.created_at, documents.length > 0],
    ['Document verified', approvedDocument?.updated_at, Boolean(approvedDocument)],
    ['Application approved', profile.updated_at, ['approved', 'active', 'completed'].includes(profile.status)],
    ['Started attachment', profile.attachment_start_date, profile.status === 'active' || profile.status === 'completed'],
    ['Completed attachment', profile.attachment_end_date, profile.status === 'completed']
  ];
  document.querySelector('#timeline').innerHTML = entries.map(([name, date, complete]) => `<li class="relative"><span class="absolute -left-[33px] grid h-4 w-4 place-items-center rounded-full ${complete ? 'bg-county-green' : 'bg-slate-200'}"></span><p class="font-semibold ${complete ? '' : 'text-slate-400'}">${name}</p><p class="mt-1 text-sm ${complete ? 'text-slate-600' : 'text-slate-400'}">${complete ? formatDate(date) : 'Not completed'}</p></li>`).join('');
}

async function renderDocuments(documents, user, profile) {
  const root = document.querySelector('#documents');
  if (!documents.length) { root.innerHTML = '<div class="rounded-lg border border-dashed border-slate-300 p-5 text-sm text-slate-500">No document uploaded yet.</div>'; return; }
  root.innerHTML = `<div class="space-y-4">${documents.map((doc) => `<article class="rounded-lg border border-slate-200 p-5"><div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p class="font-semibold">${title(doc.document_type)}</p><p class="mt-1 text-sm text-slate-500">${doc.file_name} · Uploaded ${formatDate(doc.created_at)}</p><p class="mt-2 text-sm">Status: <span class="font-bold">${title(doc.review_status)}</span></p></div><a data-file="${doc.file_path}" class="w-fit rounded-md border border-emerald-600 px-3 py-2 text-sm font-bold text-county-green hover:bg-emerald-50" href="#">Preview secure file</a></div><label class="mt-4 block text-sm font-semibold">Review status<select data-status="${doc.id}" class="mt-1 block rounded-md border border-slate-300 p-2 font-normal"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label><label class="mt-3 block text-sm font-semibold">Reviewer note<textarea data-note="${doc.id}" class="mt-1 block w-full rounded-md border border-slate-300 p-2 font-normal" rows="2" placeholder="Optional feedback for student"></textarea></label><button data-save="${doc.id}" class="mt-3 rounded-md bg-county-green px-4 py-2 text-sm font-bold text-white">Save document review</button></article>`).join('')}</div>`;
  for (const doc of documents) {
    document.querySelector(`[data-status="${doc.id}"]`).value = doc.review_status;
    document.querySelector(`[data-note="${doc.id}"]`).value = doc.reviewer_notes ?? '';
    document.querySelector(`[data-save="${doc.id}"]`).addEventListener('click', async () => {
      const review_status = document.querySelector(`[data-status="${doc.id}"]`).value;
      const reviewer_notes = document.querySelector(`[data-note="${doc.id}"]`).value.trim();
      const { error } = await supabase.from('documents').update({ review_status, reviewer_notes, reviewer_id: user.id }).eq('id', doc.id);
      flash(error ? 'Could not save document review.' : 'Document review saved.', Boolean(error));
      if (!error) { doc.review_status = review_status; doc.reviewer_notes = reviewer_notes; renderTimeline(profile, documents); }
    });
  }
  for (const link of root.querySelectorAll('[data-file]')) {
    const { data } = await supabase.storage.from('student-documents').createSignedUrl(link.dataset.file, 300);
    if (data?.signedUrl) { link.href = data.signedUrl; link.target = '_blank'; } else { link.textContent = 'File unavailable'; link.classList.add('pointer-events-none', 'text-slate-400'); }
  }
}

async function init() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !studentId) { location.replace('admin-dashboard.html'); return; }
  const { data: staff } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (!['hr_admin', 'super_admin'].includes(staff?.role)) { location.replace('dashboard.html'); return; }
  const [profileResult, documentResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', studentId).eq('role', 'student').single(),
    supabase.from('documents').select('*').eq('student_id', studentId).order('created_at', { ascending: false })
  ]);
  if (profileResult.error || documentResult.error) { flash('Unable to load this student record or its documents.', true); document.querySelector('#loading').classList.add('hidden'); return; }
  const profile = profileResult.data; const documents = documentResult.data;
  document.querySelector('#student-name').textContent = profile.full_name;
  document.querySelector('#student-email').textContent = profile.email;
  document.querySelector('#initials').textContent = profile.full_name.split(' ').map((part) => part[0]).slice(0, 2).join('');
  document.querySelector('#profile-data').innerHTML = [['Phone', profile.phone], ['National ID / Passport', profile.national_id], ['Institution', profile.institution], ['Course', profile.course], ['Attachment start', formatDate(profile.attachment_start_date)], ['Attachment end', formatDate(profile.attachment_end_date)]].map(([key, value]) => `<div><dt class="text-xs font-bold uppercase tracking-wide text-slate-500">${key}</dt><dd class="mt-1 font-medium">${value || '—'}</dd></div>`).join('');
  const statusSelect = document.querySelector('#application-status');
  statusSelect.innerHTML = statuses.map((status) => `<option value="${status}">${title(status)}</option>`).join(''); statusSelect.value = profile.status;
  statusSelect.addEventListener('change', async () => { const { error } = await supabase.from('profiles').update({ status: statusSelect.value }).eq('id', studentId); flash(error ? 'Could not update application status.' : 'Application status updated.', Boolean(error)); if (!error) { profile.status = statusSelect.value; renderTimeline(profile, documents); } });
  await renderDocuments(documents, user, profile); renderTimeline(profile, documents);
  document.querySelector('#loading').classList.add('hidden'); document.querySelector('#content').classList.remove('hidden');
}
document.querySelectorAll('[data-sign-out]').forEach((button) => button.addEventListener('click', async () => { await supabase.auth.signOut(); location.assign('../index.html'); }));
init().catch(() => flash('Unable to load the student digital file.', true));
