// ui.js — navigation, theming, toasts, modal. Shared UI plumbing used by every feature module.
import { getData, mutate } from './storage.js';

const TOP_LEVEL = ['dashboard', 'workout', 'diet', 'water', 'more'];
const SUB_SCREENS = { measurements: 'more', photos: 'more', reports: 'more', badges: 'more', settings: 'more' };

const showListeners = {}; // screenName -> [fn, ...]
let currentScreen = 'dashboard';

export function onScreenShow(name, fn) {
  (showListeners[name] = showListeners[name] || []).push(fn);
}

export function currentScreenName() {
  return currentScreen;
}

export function showScreen(name) {
  const sections = document.querySelectorAll('.screen');
  sections.forEach((s) => s.classList.toggle('active', s.dataset.screen === name));
  currentScreen = name;

  const navTarget = TOP_LEVEL.includes(name) ? name : SUB_SCREENS[name] || 'dashboard';
  document.querySelectorAll('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.nav === navTarget));

  (showListeners[name] || []).forEach((fn) => {
    try { fn(); } catch (e) { console.error('Render error on screen', name, e); }
  });

  const main = document.getElementById('screens');
  if (main) main.scrollTop = 0;
  window.scrollTo({ top: 0 });
}

export function bindNav() {
  document.body.addEventListener('click', (e) => {
    const navBtn = e.target.closest('[data-nav]');
    if (navBtn) { showScreen(navBtn.dataset.nav); return; }
    const backBtn = e.target.closest('[data-back]');
    if (backBtn) { showScreen('more'); return; }
  });
}

// ---------------- Theme ----------------
export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const headerToggle = document.getElementById('theme-toggle');
  const settingsToggle = document.getElementById('settings-theme-toggle');
  const isDark = theme === 'dark';
  if (headerToggle) headerToggle.checked = !isDark; // checked = light mode (sun side)
  if (settingsToggle) settingsToggle.checked = isDark;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0B0E14' : '#EEF1F8');
}

export function initTheme() {
  const data = getData();
  applyTheme(data.theme || 'dark');
}

export function setTheme(theme) {
  mutate((d) => { d.theme = theme; });
  applyTheme(theme);
}

export function toggleTheme() {
  const data = getData();
  setTheme(data.theme === 'dark' ? 'light' : 'dark');
}

// ---------------- Toasts ----------------
export function toast(message, type = 'default', duration = 2800) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 250);
  }, duration);
}

// ---------------- Modal ----------------
export function openModal(innerHtml) {
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-box');
  box.innerHTML = innerHtml;
  overlay.hidden = false;
  document.body.style.overflow = 'hidden';
  return box;
}

export function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.hidden = true;
  document.getElementById('modal-box').innerHTML = '';
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  if (e.target.id === 'modal-overlay') closeModal();
  const closeBtn = e.target.closest('[data-modal-close]');
  if (closeBtn) closeModal();
});

export function confirmModal({ title, message, confirmText = 'Confirm', danger = false }) {
  return new Promise((resolve) => {
    const box = openModal(`
      <p class="modal-title">${title}</p>
      <p class="field-hint">${message}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${confirmText}</button>
      </div>
    `);
    box.querySelector('[data-act="cancel"]').onclick = () => { closeModal(); resolve(false); };
    box.querySelector('[data-act="ok"]').onclick = () => { closeModal(); resolve(true); };
  });
}

// ---------------- Small formatting helpers ----------------
export function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
export function round1(n) { return Math.round(n * 10) / 10; }
export function pct(value, goal) { return goal > 0 ? clamp(Math.round((value / goal) * 100), 0, 999) : 0; }
