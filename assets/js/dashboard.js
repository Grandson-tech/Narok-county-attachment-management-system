import { supabase } from './supabase.js';

const loading = document.querySelector('#dashboard-loading');
const content = document.querySelector('#dashboard-content');
const errorBox = document.querySelector('#dashboard-error');

const statusStyles = {
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-slate-200 text-slate-700'
};

function titleCase(value) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function showError(message) {
  loading.classList.add('hidden');
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function renderChecklist(profile, documents) {
  const checks = [
    { label: 'Institution and attachment dates completed', complete: Boolean(profile.institution && profile.course && profile.attachment_start_date && profile.attachment_end_date), link: 'profile.html' },
    { label: 'Acceptance letter submitted', complete: documents.some((document) => document.document_type === 'application_letter'), link: 'documents.html' }
  ];

  document.querySelector('#checklist').innerHTML = checks.map((item) => `
    <li class="flex items-center justify-between gap-4 py-4">
      <span class="flex items-center gap-3 text-sm ${item.complete ? 'text-slate-700' : 'text-slate-500'}"><span class="grid h-6 w-6 place-items-center rounded-full ${item.complete ? 'bg-emerald-100 text-county-green' : 'bg-slate-100 text-slate-400'}">${item.complete ? '✓' : '○'}</span>${item.label}</span>
      ${item.complete ? '<span class="text-xs font-bold text-emerald-700">Complete</span>' : `<a href="${item.link}" class="text-xs font-bold text-county-green hover:underline">Complete now</a>`}
    </li>
  `).join('');
}

async function loadDashboard() {
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    window.location.replace('../login.html');
    return;
  }

  const [profileResponse, documentsResponse] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, national_id, institution, course, attachment_start_date, attachment_end_date, status, role').eq('id', user.id).single(),
    supabase.from('documents').select('document_type, review_status').eq('student_id', user.id)
  ]);

  if (profileResponse.error) {
    showError('We could not load your profile. Please refresh the page or contact the department if the issue continues.');
    return;
  }

  const profile = profileResponse.data;
  if (['hr_admin', 'super_admin'].includes(profile.role)) {
    window.location.replace('admin-dashboard.html');
    return;
  }
  const documents = documentsResponse.data ?? [];
  const firstName = profile.full_name.split(' ')[0];
  const status = profile.status ?? 'pending';
  const approvedDocuments = documents.filter((document) => document.review_status === 'approved').length;
  const statusElement = document.querySelector('#application-status');

  document.querySelector('#student-name').textContent = firstName;
  document.querySelector('#header-name').textContent = profile.full_name;
  document.querySelector('#document-count').textContent = String(documents.length);
  document.querySelector('#approved-document-count').textContent = String(approvedDocuments);
  statusElement.textContent = titleCase(status);
  statusElement.className = `mt-3 inline-flex rounded-full px-3 py-1 text-sm font-bold ${statusStyles[status] ?? statusStyles.pending}`;
  renderChecklist(profile, documents);

  loading.classList.add('hidden');
  content.classList.remove('hidden');
}

document.querySelectorAll('[data-sign-out]').forEach((button) => {
  button.addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.assign('../index.html');
  });
});

loadDashboard().catch(() => showError('Unable to reach the application service. Check your internet connection and try again.'));
