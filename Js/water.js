// water.js — one-tap water logging, daily goal, progress ring, and reminders.
import { getData, mutate, todayKey, uid } from './storage.js';
import { toast, onScreenShow, openModal, closeModal, pct } from './ui.js';
import { setRingProgress } from './charts.js';
import { checkBadges } from './badges.js';

let reminderTimer = null;

export function getDayWater(dateKey = todayKey()) {
  const data = getData();
  return data.water[dateKey] || { logs: [], total: 0 };
}

export function logWater(amountMl) {
  if (!amountMl || amountMl <= 0) return;
  const key = todayKey();
  mutate((d) => {
    if (!d.water[key]) d.water[key] = { logs: [], total: 0 };
    d.water[key].logs.push({ id: uid(), amount: amountMl, time: new Date().toISOString() });
    d.water[key].total += amountMl;
  });
  toast(`+${amountMl}ml logged 💧`, 'success');
  checkBadges();
  renderWaterScreen();
}

export function undoLastWater() {
  const key = todayKey();
  const day = getDayWater(key);
  if (!day.logs.length) { toast('Nothing to undo'); return; }
  mutate((d) => {
    const removed = d.water[key].logs.pop();
    d.water[key].total = Math.max(0, d.water[key].total - removed.amount);
  });
  renderWaterScreen();
}

export function setWaterGoal(ml) {
  if (!ml || ml < 200) return;
  mutate((d) => { d.profile.dailyWaterGoalMl = ml; });
  renderWaterScreen();
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function renderWaterScreen() {
  const data = getData();
  const key = todayKey();
  const day = getDayWater(key);
  const goal = data.profile.dailyWaterGoalMl;
  const percent = pct(day.total, goal);

  const amountEl = document.getElementById('water-amount');
  const goalDisplay = document.getElementById('water-goal-display');
  if (amountEl) amountEl.textContent = day.total;
  if (goalDisplay) goalDisplay.textContent = goal;
  setRingProgress(document.getElementById('water-ring-seg'), percent);

  const goalInput = document.getElementById('water-goal-input');
  if (goalInput && document.activeElement !== goalInput) goalInput.value = goal;

  const reminderToggle = document.getElementById('water-reminder-toggle');
  if (reminderToggle) reminderToggle.checked = !!data.profile.waterReminderEnabled;
  const intervalSelect = document.getElementById('water-interval-select');
  if (intervalSelect) intervalSelect.value = String(data.profile.waterReminderIntervalMin || 60);
  const intervalField = document.getElementById('water-interval-field');
  if (intervalField) intervalField.style.opacity = data.profile.waterReminderEnabled ? '1' : '0.45';

  const list = document.getElementById('water-log-list');
  if (list) {
    if (!day.logs.length) {
      list.innerHTML = '<p class="empty-state">No water logged yet today. Tap a quick-add button above.</p>';
    } else {
      list.innerHTML = day.logs.slice().reverse().map((l) => `
        <div class="water-log-item">
          <svg class="icon" style="color:var(--teal)"><use href="#i-droplet"/></svg>
          <span style="flex:1">${l.amount} ml</span>
          <span style="color:var(--text-3); font-size:12px; font-family:var(--font-mono)">${formatTime(l.time)}</span>
        </div>
      `).join('');
    }
  }
}

function openCustomAmountModal() {
  const box = openModal(`
    <p class="modal-title">Log custom amount</p>
    <label class="field">
      <span class="field-label">Amount (ml)</span>
      <input type="number" id="custom-water-input" min="10" step="10" placeholder="e.g. 350" autofocus />
    </label>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="custom-water-save">Add</button>
    </div>
  `);
  const input = box.querySelector('#custom-water-input');
  input.focus();
  box.querySelector('#custom-water-save').onclick = () => {
    const val = parseInt(input.value, 10);
    if (val > 0) { logWater(val); closeModal(); }
  };
}

// ---------------- Reminders (foreground only — see Settings/About note) ----------------
function fireReminder() {
  const data = getData();
  const day = getDayWater();
  if (day.total >= data.profile.dailyWaterGoalMl) return; // already hit goal, skip nagging
  if (Notification.permission === 'granted') {
    try {
      new Notification('💧 Imran Fitness', { body: 'Time to drink some water and log it.', icon: 'icons/icon-192.png' });
    } catch (e) { /* some browsers require an SW for notifications */ }
  }
}

function stopReminderTimer() {
  if (reminderTimer) { clearInterval(reminderTimer); reminderTimer = null; }
}

function startReminderTimer() {
  stopReminderTimer();
  const data = getData();
  const minutes = data.profile.waterReminderIntervalMin || 60;
  reminderTimer = setInterval(fireReminder, minutes * 60 * 1000);
}

export function initReminderIfEnabled() {
  const data = getData();
  if (data.profile.waterReminderEnabled && Notification.permission === 'granted') {
    startReminderTimer();
  }
}

async function toggleReminders(enabled) {
  if (enabled) {
    if (!('Notification' in window)) {
      toast('Notifications are not supported on this device', 'error');
      document.getElementById('water-reminder-toggle').checked = false;
      return;
    }
    let perm = Notification.permission;
    if (perm === 'default') perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      toast('Notification permission was not granted', 'error');
      document.getElementById('water-reminder-toggle').checked = false;
      return;
    }
    mutate((d) => { d.profile.waterReminderEnabled = true; });
    startReminderTimer();
    toast('Reminders enabled while the app is open');
  } else {
    mutate((d) => { d.profile.waterReminderEnabled = false; });
    stopReminderTimer();
  }
  renderWaterScreen();
}

export function initWater() {
  onScreenShow('water', renderWaterScreen);

  document.querySelectorAll('[data-water-amt]').forEach((btn) => {
    btn.addEventListener('click', () => logWater(parseInt(btn.dataset.waterAmt, 10)));
  });
  document.getElementById('water-custom-btn').addEventListener('click', openCustomAmountModal);
  document.getElementById('water-undo-btn').addEventListener('click', undoLastWater);

  const goalInput = document.getElementById('water-goal-input');
  goalInput.addEventListener('change', () => setWaterGoal(parseInt(goalInput.value, 10)));

  document.getElementById('water-reminder-toggle').addEventListener('change', (e) => toggleReminders(e.target.checked));
  document.getElementById('water-interval-select').addEventListener('change', (e) => {
    mutate((d) => { d.profile.waterReminderIntervalMin = parseInt(e.target.value, 10); });
    if (getData().profile.waterReminderEnabled) startReminderTimer();
  });

  renderWaterScreen();
}
