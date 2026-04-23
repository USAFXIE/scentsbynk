/* admin-auth.js — login page logic */

const form  = document.getElementById('login-form');
const errEl = document.getElementById('login-error');
const btn   = document.getElementById('login-btn');

form.addEventListener('submit', async e => {
  e.preventDefault();
  errEl.classList.remove('visible');
  btn.disabled    = true;
  btn.textContent = 'Signing in…';

  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: form.username.value.trim(),
        password: form.password.value
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    window.location.href = '/admin.html';
  } catch {
    errEl.classList.add('visible');
    form.classList.add('shake');
    setTimeout(() => form.classList.remove('shake'), 400);
    btn.disabled    = false;
    btn.textContent = 'Sign In';
  }
});
