// reports.js — weekly analytics: weight trend, calorie bar chart, workout frequency chart.
import { getData, todayKey, addDays, prettyDate } from './storage.js';
import { onScreenShow, round1 } from './ui.js';
import { drawLineChart, drawBarChart } from './charts.js';
import { getDayTotals } from './diet.js';

function last7Keys() {
  const keys = [];
  for (let i = 6; i >= 0; i--) keys.push(addDays(todayKey(), -i));
  return keys;
}

function dayLabel(dateKey) {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });
}

export function renderReports() {
  const data = getData();
  const keys = last7Keys();

  // ---- Compare cards (this week vs previous week avg) ----
  const prevKeys = keys.map((k) => addDays(k, -7));

  function avgWeight(dateRange) {
    const logs = data.weightLogs.filter((l) => dateRange.includes(l.date));
    if (!logs.length) return null;
    return round1(logs.reduce((s, l) => s + l.weight, 0) / logs.length);
  }
  function sumCalories(dateRange) {
    return Math.round(dateRange.reduce((s, k) => s + getDayTotals(k).calories, 0) / dateRange.length);
  }
  function countWorkouts(dateRange) {
    return data.workoutHistory.filter((h) => dateRange.includes(h.date)).length;
  }
  function countWaterGoalHits(dateRange) {
    return dateRange.filter((k) => (data.water[k]?.total || 0) >= data.profile.dailyWaterGoalMl).length;
  }

  const thisWeight = avgWeight(keys), prevWeight = avgWeight(prevKeys);
  const thisCalories = sumCalories(keys), prevCalories = sumCalories(prevKeys);
  const thisWorkouts = countWorkouts(keys), prevWorkouts = countWorkouts(prevKeys);
  const thisWater = countWaterGoalHits(keys), prevWater = countWaterGoalHits(prevKeys);

  function deltaClass(now, prev, higherIsBetter = true) {
    if (prev === null || now === null) return 'flat';
    const d = now - prev;
    if (Math.abs(d) < 0.01) return 'flat';
    return (d > 0) === higherIsBetter ? 'up' : 'down';
  }
  function deltaStr(now, prev, unit = '') {
    if (prev === null || now === null) return '—';
    const d = now - prev;
    if (Math.abs(d) < 0.01) return 'No change';
    return `${d > 0 ? '+' : ''}${round1(d)}${unit} vs prev week`;
  }

  const compareEl = document.getElementById('report-compare');
  compareEl.innerHTML = [
    { label: 'Avg weight', value: thisWeight != null ? thisWeight + ' kg' : '—', delta: deltaStr(thisWeight, prevWeight, ' kg'), cls: deltaClass(thisWeight, prevWeight, false) },
    { label: 'Avg calories/day', value: thisCalories + ' kcal', delta: deltaStr(thisCalories, prevCalories, ''), cls: deltaClass(thisCalories, prevCalories, true) },
    { label: 'Workouts', value: thisWorkouts + ' sessions', delta: deltaStr(thisWorkouts, prevWorkouts, ''), cls: deltaClass(thisWorkouts, prevWorkouts, true) },
    { label: 'Water goal days', value: thisWater + ' / 7', delta: deltaStr(thisWater, prevWater, ''), cls: deltaClass(thisWater, prevWater, true) },
  ].map((c) => `
    <div class="compare-card glass">
      <span class="label">${c.label}</span>
      <span class="value">${c.value}</span>
      <span class="delta ${c.cls}">${c.delta}</span>
    </div>
  `).join('');

  // ---- Weight trend chart (last 14 days) ----
  const weightPoints = data.weightLogs.slice(-14).map((l) => ({ x: l.date.slice(5), y: l.weight }));
  const weightCanvas = document.getElementById('report-weight-chart');
  if (weightCanvas) drawLineChart(weightCanvas, weightPoints);

  // ---- Calorie bar chart (last 7 days) ----
  const calPoints = keys.map((k) => ({ x: dayLabel(k), y: getDayTotals(k).calories }));
  const calCanvas = document.getElementById('report-calorie-chart');
  if (calCanvas) drawBarChart(calCanvas, calPoints, { goalLine: data.profile.dailyCalorieGoal });

  // ---- Workout frequency bar chart (last 7 days) ----
  const wkPoints = keys.map((k) => ({ x: dayLabel(k), y: data.workoutHistory.some((h) => h.date === k) ? 1 : 0 }));
  const wkCanvas = document.getElementById('report-workout-chart');
  if (wkCanvas) drawBarChart(wkCanvas, wkPoints, { color: getComputedStyle(document.documentElement).getPropertyValue('--violet').trim() });
}

export function initReports() {
  onScreenShow('reports', renderReports);
}
