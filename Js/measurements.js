// measurements.js — body measurements form, history, trend charts.
import { getData, mutate, todayKey, prettyDate, uid } from './storage.js';
import { toast, onScreenShow } from './ui.js';
import { drawLineChart } from './charts.js';
import { checkBadges } from './badges.js';

const FIELDS = ['chest', 'arms', 'waist', 'shoulders', 'thighs'];

export function initMeasurements() {
  onScreenShow('measurements', renderMeasurements);

  document.getElementById('measurement-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const values = {};
    FIELDS.forEach((f) => { const v = parseFloat(document.getElementById(`m-${f}`).value); if (v > 0) values[f] = v; });
    if (!Object.keys(values).length) { toast('Enter at least one measurement', 'error'); return; }
    mutate((d) => { d.measurements.push({ id: uid(), date: todayKey(), ...values }); });
    checkBadges();
    toast('Measurements saved 📏', 'success');
    renderMeasurements();
  });

  document.getElementById('measurement-chart-select').addEventListener('change', () => drawMeasurementChart());
}

function renderMeasurements() {
  const data = getData();
  const latest = data.measurements.length ? data.measurements[data.measurements.length - 1] : {};
  FIELDS.forEach((f) => { const el = document.getElementById(`m-${f}`); if (el && latest[f]) el.value = latest[f]; });
  drawMeasurementChart();
  renderMeasurementHistory(data);
}

function drawMeasurementChart() {
  const data = getData();
  const field = document.getElementById('measurement-chart-select').value;
  const canvas = document.getElementById('measurement-chart');
  const points = data.measurements
    .filter((m) => m[field] != null)
    .slice(-14)
    .map((m) => ({ x: m.date.slice(5), y: m[field] }));
  drawLineChart(canvas, points, { color: getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#2DD4BF' });
}

function renderMeasurementHistory(data) {
  const hist = document.getElementById('measurement-history');
  if (!data.measurements.length) { hist.innerHTML = '<p class="empty-state">No measurements logged yet.</p>'; return; }
  const sorted = [...data.measurements].sort((a, b) => (a.date < b.date ? 1 : -1));
  hist.innerHTML = sorted.map((m) => {
    const parts = FIELDS.filter((f) => m[f] != null).map((f) => `${f}: ${m[f]}cm`);
    return `
      <div class="history-item">
        <div class="history-item-main">
          <p class="history-item-date">${prettyDate(m.date)}</p>
          <p class="history-item-sub">${parts.join(' · ')}</p>
        </div>
        <button class="icon-btn ghost" data-del-measurement="${m.id}" aria-label="Delete">
          <svg class="icon"><use href="#i-trash"/></svg>
        </button>
      </div>
    `;
  }).join('');

  hist.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-del-measurement]');
    if (!btn) return;
    mutate((d) => { d.measurements = d.measurements.filter((m) => m.id !== btn.dataset.delMeasurement); });
    renderMeasurements();
  });
}
