// reports.js — weekly analytics: weight/calorie/workout charts + summary compare cards.
import { getData, addDays, todayKey, prettyDate } from './storage.js';
import { onScreenShow } from './ui.js';
import { drawLineChart, drawBarChart } from './charts.js';

function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(todayKey(), -i));
  return days;
}

function shortLabel(dateKey) {
  return new Date(dateKey + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' });
}

export function renderReports() {
  const data = getData();
  const days = last7Days();

  // Weight chart
  const weightPoints = [];
  let lastKnown = null;
  days.forEach((d) => {
    const entry = data.weightLogs.find((w) => w.date === d);
    if (entry) lastKnown = entry.weight;
    if (lastKnown != null) weightPoints.push({ x: shortLabel(d), y: lastKnown });
  });
  drawLineChart(document.getElementById('report-weight-chart'), weightPoints.length >= 2 ? weightPoints : null,
    { color: getComputedStyle(document.documentElement).getPropertyValue('--teal').trim() || '#2DD4BF' });

  // Calorie bar chart
  const calPoints = days.map((d) => {
    const day = data.diet[d];
    let cal = 0;
    if (day) ['breakfast', 'lunch', 'dinner', 'snacks'].forEach((m) => (day[m] || []).forEach((i) => { cal += i.calories; }));
    return { x: shortLabel(d), y: Math.round(cal) };
  });
  drawBarChart(document.getElementById('report-calorie-chart'), calPoints,
    { color: getComputedStyle(document.documentElement).getPropertyValue('--orange').trim() || '#FF7A45',
      goalLine: data.profile.dailyCalorieGoal });

  // Workout bar (1 = worked out, 0 = not)
  const workoutPoints = days.map((d) => ({
    x: shortLabel(d),
    y: data.workoutHistory.some((h) => h.date === d) ? 1 : 0,
  }));
  drawBarChart(document.getElementById('report-workout-chart'), workoutPoints,
    { color: getComputedStyle(document.documentElement).getPropertyValue('--violet').trim() || '#8B7CF6' });

  // Compare cards: this week vs prev week
  const thisWeekCal = calPoints.reduce((s, p) => s + p.y, 0);
  const prevDays = Array.from({ length: 7 }, (_, i) => addDays(todayKey(), -14 + i));
  const prevWeekCal = prevDays.reduce((s, d) => {
    const day = data.diet[d];
    if (!day) return s;
    return s + ['breakfast', 'lunch', 'dinner', 'snacks'].reduce((cs, m) => cs + (day[m] || []).reduce((ms, i) => ms + i.calories, 0), 0);
  }, 0);

  const workoutsThisWeek = days.filter((d) => data.workoutHistory.some((h) => h.date === d)).length;
  const workoutsPrevWeek = prevDays.filter((d) => data.workoutHistory.some((h) => h.date === d)).length;

  const latestWeight = data.weightLogs.length ? data.weightLogs[data.weightLogs.length - 1].weight : null;
  const startWeight = data.profile.startWeight;
  const target = data.profile.targetWeight;
  const gained = latestWeight != null ? +(latestWeight - startWeight).toFixed(1) : null;

  function delta(current, prev, higherIsBetter = true) {
    if (!prev) return '';
    const diff = +(current - prev).toFixed(1);
    const cls = diff === 0 ? 'flat' : diff > 0 === higherIsBetter ? 'up' : 'down';
    return '<span class="delta ' + cls + '">' + (diff > 0 ? '+' : '') + diff + '</span>';
  }

  const compareEl = document.getElementById('report-compare');
  compareEl.innerHTML = [
    { label: 'Workouts this week', value: workoutsThisWeek + ' / 7', deltaHtml: delta(workoutsThisWeek, workoutsPrevWeek) },
    { label: 'Avg daily calories', value: Math.round(thisWeekCal / 7) + ' kcal', deltaHtml: delta(thisWeekCal, prevWeekCal) },
    { label: 'Weight gained', value: gained != null ? (gained >= 0 ? '+' : '') + gained + ' kg' : '—', deltaHtml: '' },
    { label: 'Streak', value: (data.streak.count || 0) + ' days', deltaHtml: '' },
  ].map((c) =>
    '<div class="compare-card glass">' +
    '<span class="label">' + c.label + '</span>' +
    '<span class="value">' + c.value + '</span>' +
    c.deltaHtml +
    '</div>'
  ).join('');
}

export function initReports() {
  onScreenShow('reports', renderReports);
  renderReports();
}
