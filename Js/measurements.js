// measurements.js — body measurements (chest/arms/waist/shoulders/thighs) + trend charts.
import { getData, mutate, todayKey, prettyDate, uid } from './storage.js';
import { toast, onScreenShow } from './ui.js';
import { drawLineChart } from './charts.js';
import { checkBadges } from './badges.js';

const FIELDS = ['chest', 'arms', 'waist', 'shoulders', 'thighs'];

function saveMeasurement(values) {
  const dateKey = todayKey();
  mutate((d) => {
    const existing = d.measurements.findIndex((m) => m.date === dateKey);
    const entry = { id: uid(), date: dateKey, ...values };
    if (existing >= 0) d.measurements[existing] = entry;
    else d.measurements.push(entry);
    d.measurements.sort((a, b) => (a.date < b.date ? -1 : 1));
  });
  checkBadges();
  toast('Measurements saved 📏', 'success');
  renderMeasurements();
}

export function renderMeasurements() {
  const data = getData();

  if (data.measurements.length) {
    const latest = data.measurements[data.measurements.length - 1];
    FIELDS.forEach((f) => {
      const el = document.getElementById(`m-${f}`);
      if (el && document.activeElement !== el) el.value = latest[f] || '';
    });
  }

  const select = document.getElementById('measurement-chart-select');
  const field = select ? select.value : 'chest';
  const canvas = document.getElementById('measurement-chart');
  if (canvas) {
    const colorVarMap = { chest: '--orange', arms: '--violet', waist: '--red', shoulders: '--teal', thighs: '--green' };
    const color = getComputedStyle(document.documentElement).getPropertyValue(colorVarMap[field] || '--violet').trim();
    const points = data.measurements
      .filter((m) => m[field] != null)
      .map((m) => ({ x: m.date.slice(5), y: parseFloat(m[field]) }));
    drawLineChart(canvas, points, { color: color || '#8B7CF6' });
  }

  const list = document.getElementById('measurement-history');
  if (!data.measurements.length) {
    list.innerHTML = '<p class="empty-state">No measurements yet. Fill in today\'s above.</p>';
    return;
  }
  const sorted = [...data.measurements].reverse();
  list.innerHTML = sorted.map((m) => `
    <div class="history-item">
      <div class="history-item-main">
        <p class="history-item-date">${prettyDate(m.date)}</p>
        <p class="history-item-sub">${FIELDS.filter((f) => m[f]).map((f) => f + ': ' + m[f] + ' cm').join(' · ')}</p>
      </div>
      <button class="icon-btn ghost" data-del-measurement="${m.id}" aria-label="Delete"><svg class="icon"><use href="#i-trash"/></svg></button>
    </div>
  `).join('');
}

function deleteMeasurement(id) {
  mutate((d) => { d.measurements = d.measurements.filter((m) => m.id !== id); });
  renderMeasurements();
}

export function initMeasurements() {
  onScreenShow('measurements', renderMeasurements);

  document.getElementById('measurement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const values = {};
    let hasAny = false;
    FIELDS.forEach((f) => {
      const val = parseFloat(document.getElementById('m-' + f).value);
      if (!isNaN(val) && val > 0) { values[f] = val; hasAny = true; }
    });
    if (!hasAny) { toast('Enter at least one measurement', 'error'); return; }
    saveMeasurement(values);
  });

  document.getElementById('measurement-chart-select').addEventListener('change', renderMeasurements);

  document.getElementById('measurement-history').addEventListener('click', (e) => {
    const del = e.target.closest('[data-del-measurement]');
    if (del) deleteMeasurement(del.dataset.delMeasurement);
  });

  renderMeasurements();
}
