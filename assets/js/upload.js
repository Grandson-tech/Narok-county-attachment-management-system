import { supabase } from './supabase.js';

const form = document.querySelector('#upload-form');
const list = document.querySelector('#documents-list');
const alertBox = document.querySelector('#alert');
const submitButton = form.querySelector('button[type="submit"], button:not([type])');
let user;

const label = (value) => value === 'application_letter' ? 'Acceptance letter' : value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const flash = (text, bad = false) => { alertBox.className = `mt-6 rounded-md border px-4 py-3 text-sm ${bad ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`; alertBox.textContent = text; };

async function loadDocuments() {
  const { data: documents, error } = await supabase.from('documents').select('*').order('created_at', { ascending: false });
  if (error) { flash('Unable to load the acceptance letter.', true); return; }
  list.innerHTML = documents.length ? documents.map((doc) => `<article class="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div><p class="font-semibold">Acceptance letter</p><p class="mt-1 text-sm text-slate-500">${doc.file_name}</p>${doc.reviewer_notes ? `<p class="mt-1 text-sm text-slate-600">HR note: ${doc.reviewer_notes}</p>` : ''}</div><div class="flex items-center gap-3"><span class="rounded-full px-3 py-1 text-xs font-bold ${doc.review_status === 'approved' ? 'bg-emerald-100 text-emerald-800' : doc.review_status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}">${label(doc.review_status)}</span>${doc.review_status === 'pending' ? `<button data-delete="${doc.id}" data-path="${doc.file_path}" class="text-sm font-bold text-red-700 hover:underline">Remove</button>` : ''}</div></article>`).join('') : '<p class="p-5 text-sm text-slate-500">No acceptance letter has been sent.</p>';
  list.querySelectorAll('[data-delete]').forEach((button) => button.addEventListener('click', async () => {
    if (!window.confirm('Remove this pending acceptance letter?')) return;
    const { error: dbError } = await supabase.from('documents').delete().eq('id', button.dataset.delete).eq('student_id', user.id).eq('review_status', 'pending');
    if (dbError) { flash('Could not remove the letter.', true); return; }
    await supabase.storage.from('student-documents').remove([button.dataset.path]);
    flash('Acceptance letter removed. You may upload the correct file now.'); loadDocuments();
  }));
}

({ data: { user } } = await supabase.auth.getUser());
if (!user) location.replace('../login.html'); else loadDocuments();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  submitButton.disabled = true; submitButton.textContent = 'Uploading…';
  try {
    const values = new FormData(form); const file = values.get('file'); const documentType = 'application_letter';
    if (!file || file.size > 10 * 1024 * 1024) { flash('Choose a file that is 10 MB or smaller.', true); return; }
    const { data: existing, error: checkError } = await supabase.from('documents').select('id').eq('student_id', user.id).eq('document_type', documentType).limit(1);
    if (checkError) { flash('Unable to check for an existing letter.', true); return; }
    if (existing.length) { flash('An acceptance letter has already been sent. You cannot send another one.', true); return; }
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const { error: uploadError } = await supabase.storage.from('student-documents').upload(path, file);
    if (uploadError) { flash(uploadError.message, true); return; }
    const { error: databaseError } = await supabase.from('documents').insert({ student_id: user.id, document_type: documentType, file_name: file.name, file_path: path, file_size: file.size, mime_type: file.type });
    if (databaseError) { await supabase.storage.from('student-documents').remove([path]); flash(databaseError.message, true); return; }
    form.reset(); flash('Acceptance letter sent successfully. Its status is Pending until HR reviews it.'); await loadDocuments();
  } catch (error) {
    console.error('Document upload failed:', error);
    flash('Upload failed unexpectedly. Please try again or contact support.', true);
  } finally { submitButton.disabled = false; submitButton.textContent = 'Upload acceptance letter'; }
});
document.querySelectorAll('[data-sign-out]').forEach((button) => button.addEventListener('click', async () => { await supabase.auth.signOut(); location.assign('../index.html'); }));
