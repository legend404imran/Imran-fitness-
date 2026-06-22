// main.js — app bootstrap: auth guard, navigation, theme, feature module init.
import { isLoggedIn, attemptLogin, logout, lockStatus, formatRemaining } from './auth.js';
import { loadData } from './storage.js';
import { bindNav, showScreen, initTheme, setTheme, toggleTheme, toast } from './ui.js';
import { initDashboard } from './dashboard.js';
import { initWorkout } from './workout.js';
import { initDiet } from './diet.js';
import { initWater, initReminderIfEnabled } from './water.js';
import { initMeasurements } from './measurements.js';
import { initPhotos } from './photos.js';
import { initReports } from './reports.js';
import { initBadges } from './badges_screen.js';
import { initSettings } from './settings.js';

// ---- Register service worker ----
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then((reg) => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            document.getElementById('update-banner').hidden = false;
          }
        });
      });
    }).catch((err) => console.warn('SW registration failed:', err));
  });
}
document.getElementById('update-reload-btn')?.addEventListener('click', () => location.reload());

// ---- Install prompt ----
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.hidden = false;
});
document.getElementById('install-btn')?.addEventListener('click', async () => {
  if (!deferredInstall) return;
  deferredInstall.prompt();
  const { outcome } = await deferredInstall.userChoice;
  deferredInstall = null;
  document.getElementById('install-btn').hidden = true;
  if (outcome === 'accepted') toast('App installed!', 'success');
});
window.addEventListener('appinstalled', () => {
  document.getElementById('install-btn').hidden = true;
  deferredInstall = null;
});

// ---- Auth / login screen ----
function showLogin() {
  document.getElementById('login-screen').hidden = false;
  document.getElementById('app-shell').hidden = true;
  document.getElementById('login-password').value = '';
  refreshLockUI();
}

function showApp() {
  document.getElementById('login-screen').hidden = true;
  document.getElementById('app-shell').hidden = false;
}

let lockInterval = null;
function refreshLockUI() {
  const { locked, remainingMs } = lockStatus();
  const lockDiv = document.getElementById('login-lock');
  const submitBtn = document.getElementById('login-submit');
  const errorP = document.getElementById('login-error');

  if (locked) {
    lockDiv.hidden = false;
    submitBtn.disabled = true;
    errorP.hidden = true;
    document.getElementById('lock-countdown').textContent = formatRemaining(remainingMs);
    if (!lockInterval) {
      lockInterval = setInterval(() => {
        const st = lockStatus();
        if (!st.locked) {
          clearInterval(lockInterval); lockInterval = null;
          lockDiv.hidden = true;
          submitBtn.disabled = false;
          document.getElementById('login-error').textContent = '';
        } else {
          document.getElementById('lock-countdown').textContent = formatRemaining(st.remainingMs);
        }
      }, 500);
    }
  } else {
    lockDiv.hidden = true;
    submitBtn.disabled = false;
  }
}

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const result = attemptLogin(username, password);

  if (result.success) {
    showApp();
    return;
  }

  const errorP = document.getElementById('login-error');
  if (result.locked) {
    refreshLockUI();
  } else {
    const lockSeconds = result.lockSeconds;
    const lockMsg = lockSeconds
      ? ` Locked for ${lockSeconds >= 60 ? lockSeconds / 60 + ' min' : lockSeconds + ' sec'}.`
      : '';
    errorP.textContent = `Wrong username or password.${lockMsg}`;
    errorP.hidden = false;
    refreshLockUI();
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  }
});

// Toggle password visibility
document.getElementById('toggle-pw').addEventListener('click', () => {
  const pw = document.getElementById('login-password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
});

// ---- Theme toggles ----
document.getElementById('theme-toggle').addEventListener('change', () => toggleTheme());

// ---- Logout ----
document.getElementById('more-logout').addEventListener('click', () => {
  logout();
  showLogin();
  toast('Signed out');
});

// ---- More grid sub-screen nav ----
// (handled by bindNav in ui.js via data-nav attributes)

// ---- Boot ----
function boot() {
  loadData();
  initTheme();
  bindNav();

  initDashboard();
  initWorkout();
  initDiet();
  initWater();
  initMeasurements();
  initPhotos();
  initReports();
  initBadges();
  initSettings();
  initReminderIfEnabled();

  if (isLoggedIn()) {
    showApp();
    showScreen('dashboard');
  } else {
    showLogin();
  }
}

boot();
