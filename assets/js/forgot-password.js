import { supabase } from './supabase.js';

const requestSection = document.querySelector('#request-reset-section');
const updateSection = document.querySelector('#update-password-section');
const requestForm = document.querySelector('#request-reset-form');
const updateForm = document.querySelector('#update-password-form');

function showAlert(element, message, type = 'error') {
  const styles = type === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : 'border-red-200 bg-red-50 text-red-800';
  element.className = `mt-6 rounded-md border px-4 py-3 text-sm ${styles}`;
  element.textContent = message;
}

function showUpdateForm() {
  requestSection.classList.add('hidden');
  updateSection.classList.remove('hidden');
}

supabase.auth.onAuthStateChange((event) => {
  if (event === 'PASSWORD_RECOVERY') {
    showUpdateForm();
  }
});

if (window.location.hash.includes('type=recovery')) {
  showUpdateForm();
}

requestForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#request-button');
  const alertBox = document.querySelector('#request-alert');
  const email = new FormData(requestForm).get('email')?.trim();

  button.disabled = true;
  button.textContent = 'Sending link...';

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL('./forgot-password.html', window.location.href).href
    });
    if (error) throw error;
    showAlert(alertBox, 'If an account exists for that email, a password reset link has been sent.', 'success');
  } catch (error) {
    showAlert(alertBox, error.message === 'Failed to fetch' ? 'Unable to reach Supabase. Check your connection and configuration.' : error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Send reset link';
  }
});

updateForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#update-button');
  const alertBox = document.querySelector('#update-alert');
  const values = Object.fromEntries(new FormData(updateForm).entries());

  if (values.password.length < 8 || values.password !== values.confirmPassword) {
    showAlert(alertBox, 'Use a password of at least 8 characters and make sure both passwords match.');
    return;
  }

  button.disabled = true;
  button.textContent = 'Updating password...';

  try {
    const { error } = await supabase.auth.updateUser({ password: values.password });
    if (error) throw error;
    showAlert(alertBox, 'Your password has been updated. Redirecting to sign in…', 'success');
    window.setTimeout(() => window.location.assign('login.html'), 1500);
  } catch (error) {
    showAlert(alertBox, error.message);
  } finally {
    button.disabled = false;
    button.textContent = 'Update password';
  }
});
