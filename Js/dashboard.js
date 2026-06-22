// dashboard.js — the home screen. Pulls together weight, BMI, today's calories/water/workout.
import { getData, mutate, todayKey } from './storage.js';
import { toast, onScreenShow, openModal, closeModal, pct, round1 } from './ui.js';
import { setRingProgress } from './charts.js';
import { getTodayQuote } from './quotes.js';
import { logWater } from './water.js';
import { getDayTotals as getDietDayTotals } from './diet.js';
import { checkBadges } from './badges.js';

function currentWeight(data) {
  if (data.weightLogs.length) return data.weightLogs[data.weightLogs.length - 1].weight;
  return data.profile.startWeight;
}

function bmiInfo(weightKg, heightCm) {
  if (!heightCm) return { value: null, label: 'BMI' };
  const h = heightCm / 100;
  const bmi = weightKg / (h * h);
  let label = 'Normal';
  if (bmi < 18.5) label = 'Underweight';
  else if (bmi < 25) label = 'Normal';
  else if (bmi < 30) label = 'Overweight';
  else label = 'Obese';
  return { value: round1(bmi), label };
}

export function addOrUpdateWeightLog(dateKey, weight) {
  mutate((d) => {
    const existing = d.weightLogs.find((w) => w.date === dateKey);
    if (existing) existing.weight = weight;
    else d.weightLogs.push({ date: dateKey, weight });
    d.weightLogs.sort((a, b) => (a.date < b.date ? -1 : 1));
  });
  checkBadges();
}

function openWeightModal() {
  const data = getData();
  const box = openModal(`
    <p class="modal-title">Log your weight</p>
    <label class="field">
      <span class="field-label">Date</span>
      <input type="date" id="weight-date-input" value="${todayKey()}" max="${todayKey()}" />
    </label>
    <label class="field">
      <span class="field-label">Weight (kg)</span>
      <input type="number" id="weight-value-input" step="0.1" value="${currentWeight(data)}" autofocus />
    </label>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="weight-save-btn">Save</button>
    </div>
  `);
  box.querySelector('#weight-save-btn').onclick = () => {
    const date = box.querySelector('#weight-date-input').value || todayKey();
    const weight = parseFloat(box.querySelector('#weight-value-input').value);
    if (!weight || weight <= 0) { toast('Enter a valid weight', 'error'); return; }
    addOrUpdateWeightLog(date, weight);
    closeModal();
    toast('Weight saved 📈', 'success');
    renderDashboard();
  };
}

export function renderDashboard() {
  const data = getData();
  const key = todayKey();

  document.getElementById('quote-text').textContent = `"${getTodayQuote()}"`;
  const headerDate = document.getElementById('header-date');
  if (headerDate) headerDate.textContent = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

  const weight = currentWeight(data);
  const target = data.profile.targetWeight;
  const bmi = bmiInfo(weight, data.profile.heightCm);

  document.getElementById('stat-current-weight').textContent = `${round1(weight)} kg`;
  document.getElementById('stat-target-weight').textContent = `${round1(target)} kg`;
  document.getElementById('stat-bmi').textContent = bmi.value ?? '—';
  document.getElementById('stat-bmi-label').textContent = bmi.value ? `BMI · ${bmi.label}` : 'BMI';
  document.getElementById('stat-streak').textContent = data.streak.count || 0;

  // Today: calories
  const dietTotals = getDietDayTotals(key);
  const calGoal = data.profile.dailyCalorieGoal;
  const calPct = pct(dietTotals.calories, calGoal);
  document.getElementById('summary-calories').textContent = `${dietTotals.calories} / ${calGoal} kcal`;
  document.getElementById('bar-calories').style.width = `${Math.min(100, calPct)}%`;

  // Today: water
  const dayWater = data.water[key] || { total: 0 };
  const waterGoal = data.profile.dailyWaterGoalMl;
  const waterPct = pct(dayWater.total, waterGoal);
  document.getElementById('summary-water').textContent = `${dayWater.total} / ${waterGoal} ml`;
  document.getElementById('bar-water').style.width = `${Math.min(100, waterPct)}%`;

  // Today: workout
  const workedOutToday = data.workoutHistory.some((h) => h.date === key);
  document.getElementById('summary-workout').textContent = workedOutToday ? 'Completed ✓' : 'Not logged';
  document.getElementById('bar-workout').style.width = workedOutToday ? '100%' : '0%';

  // Ring
  const overall = Math.round((Math.min(100, calPct) + Math.min(100, waterPct) + (workedOutToday ? 100 : 0)) / 3);
  document.getElementById('ring-overall-pct').textContent = `${overall}%`;
  document.getElementById('legend-calories-pct').textContent = `${calPct}%`;
  document.getElementById('legend-water-pct').textContent = `${waterPct}%`;
  document.getElementById('legend-workout-pct').textContent = workedOutToday ? '100%' : '0%';
  setRingProgress(document.getElementById('ring-calories'), calPct);
  setRingProgress(document.getElementById('ring-water'), waterPct);
  setRingProgress(document.getElementById('ring-workout'), workedOutToday ? 100 : 0);
}

export function initDashboard() {
  onScreenShow('dashboard', renderDashboard);
  document.getElementById('open-weight-modal').addEventListener('click', openWeightModal);
  document.getElementById('quick-log-weight').addEventListener('click', openWeightModal);
  document.getElementById('quick-add-water').addEventListener('click', () => { logWater(250); renderDashboard(); });
  renderDashboard();
}
