// main.js — application entry point.
// Wires: auth, feature modules, navigation, PWA install prompt, service worker.

import { loadData } from './storage.js';
import { attemptLogin, isLoggedIn, logout, lockStatus, formatRemaining } from './auth.js';
import { bindNav, showScreen, initTheme, setTheme, toggleTheme, toast } from './ui.js';
import { initDashboard } from './dashboard.js';
import { initWorkout } from './workout.js';
import { initDiet } from './diet.js';
import { initWater, initReminderIfEnabled } from './water.js';
import { initMeasurements } from './measurements.js';
import { initPhotos } from './photos.js';
import { initReports } from './reports.js';
import { initBadgesScreen } from './badges-screen.js';
import { initSettings } from './settings.js';

// ─────────────────────────────────────────
// 1. Bootstrap storage (fills in defaults)
// ─────────────────────────────────────────
loadData();

// ─────────────────────────────────────────
// 2. Auth screen
// ─────────────────────────────────────────
const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');

function showApp() {
  loginScreen.hidden = true;
  appShell.hidden = false;
}

function showLogin() {
  loginScreen.hidden = false;
  appShell.hidden = true;
}

// Restore session without re-logging in
if (isLoggedIn()) {
  showApp();
} else {
  showLogin();
}

// Lock countdown ticker
let lockTicker = null;

function startLockCountdown(lockUntilMs) {
  clearInterval(lockTicker);
  const countEl = document.getElementById('lock-countdown');
  const lockEl = document.getElementById('login-lock');
  const submitBtn = document.getElementById('login-submit');
  lockEl.hidden = false;
  submitBtn.disabled = true;

  function tick() {
    const remaining = lockUntilMs - Date.now();
    if (remaining <= 0) {
      clearInterval(lockTicker);
      lockEl.hidden = true;
      submitBtn.disabled = false;
    } else {
      countEl.textContent = formatRemaining(remaining);
    }
  }
  tick();
  lockTicker = setInterval(tick, 500);
}

// Restore any active lockout on page load
(function checkInitialLock() {
  const status = lockStatus();
  if (status.locked) startLockCountdown(Date.now() + status.remainingMs);
})();

// Toggle password visibility (using the eye icon placeholder)
document.getElementById('toggle-pw').addEventListener('click', () => {
  const pw = document.getElementById('login-password');
  pw.type = pw.type === 'password' ? 'text' : 'password';
});

document.getElementById('login-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');

  const result = attemptLogin(username, password);

  if (result.success) {
    errorEl.hidden = true;
    showApp();
    initApp();
  } else if (result.locked) {
    startLockCountdown(Date.now() + result.remainingMs);
  } else {
    const lockMsg = `Account locked for ${result.lockSeconds < 60
      ? result.lockSeconds + 's'
      : Math.round(result.lockSeconds / 60) + 'min'} after ${result.failedAttempts} failed attempt${result.failedAttempts > 1 ? 's' : ''}.`;
    errorEl.textContent = result.failedAttempts >= 1
      ? `Wrong password. ${lockMsg}`
      : 'Wrong username or password.';
    errorEl.hidden = false;
    startLockCountdown(lockStatus().lockUntil - Date.now() + Date.now());
  }
});

// ─────────────────────────────────────────
// 3. App initialisation (runs once after login)
// ─────────────────────────────────────────
let appInited = false;

function initApp() {
  if (appInited) return;
  appInited = true;

  initTheme();
  bindNav();

  // Feature modules
  initDashboard();
  initWorkout();
  initDiet();
  initWater();
  initMeasurements();
  initPhotos();
  initReports();
  initBadgesScreen();
  initSettings();

  // Start on dashboard
  showScreen('dashboard');

  // Header date
  const headerDate = document.getElementById('header-date');
  if (headerDate) {
    headerDate.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  }

  // Reminders
  initReminderIfEnabled();

  // Theme toggle (header)
  document.getElementById('theme-toggle').addEventListener('change', () => toggleTheme());

  // More-screen logout
  document.getElementById('more-logout').addEventListener('click', () => {
    logout();
    appInited = false;
    showLogin();
    document.getElementById('login-username').value = '';
    document.getElementById('login-password').value = '';
  });
}

// If the user was already logged in and the app loaded directly to the shell:
if (isLoggedIn()) {
  initApp();
}

// ─────────────────────────────────────────
// 4. PWA install prompt
// ─────────────────────────────────────────
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  const btn = document.getElementById('install-btn');
  if (btn) btn.hidden = false;
});

document.getElementById('install-btn').addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('install-btn').hidden = true;
  if (outcome === 'accepted') toast('Imran Fitness installed! 🎉', 'success', 3500);
});

window.addEventListener('appinstalled', () => {
  document.getElementById('install-btn').hidden = true;
  toast('App installed successfully 🎉', 'success', 3500);
});

// ─────────────────────────────────────────
// 5. Service Worker registration
// ─────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./sw.js');
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const banner = document.getElementById('update-banner');
            if (banner) banner.hidden = false;
            document.getElementById('update-reload-btn').addEventListener('click', () => {
              newWorker.postMessage({ action: 'skipWaiting' });
              window.location.reload();
            });
          }
        });
      });
    } catch (err) {
      console.warn('Service worker registration failed:', err);
    }
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });
}
