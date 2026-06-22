// workout.js — Push/Pull/Legs splits, custom exercises, set logging, history, personal records.
import { getData, mutate, todayKey, addDays, prettyDate, uid } from './storage.js';
import { toast, onScreenShow, openModal, closeModal, confirmModal } from './ui.js';
import { checkBadges } from './badges.js';

const SPLIT_LABEL = { push: 'Push', pull: 'Pull', legs: 'Legs' };
let currentSplit = 'push';
const openHistoryIds = new Set();

function ensureSession(data) {
  if (!data.activeSession || data.activeSession.date !== todayKey()) {
    data.activeSession = { date: todayKey(), entries: {} };
  }
  return data.activeSession;
}

function sessionSetsFor(exerciseId) {
  const data = getData();
  if (!data.activeSession || data.activeSession.date !== todayKey()) return [];
  return data.activeSession.entries[exerciseId]?.sets || [];
}

function addSet(exerciseId, exerciseName, reps, weight) {
  mutate((d) => {
    const session = ensureSession(d);
    if (!session.entries[exerciseId]) session.entries[exerciseId] = { name: exerciseName, split: currentSplit, sets: [] };
    session.entries[exerciseId].sets.push({ reps, weight });
  });
  renderExercises();
}

function removeSet(exerciseId, index) {
  mutate((d) => {
    const session = ensureSession(d);
    if (session.entries[exerciseId]) {
      session.entries[exerciseId].sets.splice(index, 1);
      if (!session.entries[exerciseId].sets.length) delete session.entries[exerciseId];
    }
  });
  renderExercises();
}

function addExercise(name) {
  mutate((d) => { d.workoutSplits[currentSplit].push({ id: uid(), name, custom: true }); });
  renderExercises();
}

async function deleteExercise(exId) {
  const ok = await confirmModal({ title: 'Remove exercise?', message: 'This removes it from this split. Past history is kept.', confirmText: 'Remove', danger: true });
  if (!ok) return;
  mutate((d) => {
    d.workoutSplits[currentSplit] = d.workoutSplits[currentSplit].filter((e) => e.id !== exId);
    if (d.activeSession?.entries?.[exId]) delete d.activeSession.entries[exId];
  });
  renderExercises();
}

function recomputeFromHistory(d) {
  // Personal records
  const records = {};
  d.workoutHistory.forEach((session) => {
    session.exercises.forEach((ex) => {
      ex.sets.forEach((s) => {
        const cur = records[ex.name];
        const better = !cur || s.weight > cur.weight || (s.weight === cur.weight && s.reps > cur.reps);
        if (better) records[ex.name] = { weight: s.weight, reps: s.reps, date: session.date };
      });
    });
  });
  d.personalRecords = records;

  // Streak: consecutive days ending today (or yesterday if today not logged yet)
  const dates = [...new Set(d.workoutHistory.map((h) => h.date))].sort();
  const dateSet = new Set(dates);
  let cursor = todayKey();
  let count = 0;
  if (dateSet.has(cursor)) { count = 1; cursor = addDays(cursor, -1); }
  while (dateSet.has(cursor)) { count++; cursor = addDays(cursor, -1); }
  d.streak = { count, lastWorkoutDate: dates.length ? dates[dates.length - 1] : null };
}

function finishWorkout() {
  const data = getData();
  const session = data.activeSession;
  if (!session || session.date !== todayKey() || !Object.keys(session.entries).length) {
    toast('Log at least one set before finishing', 'error');
    return;
  }

  const exercises = Object.entries(session.entries).map(([id, e]) => ({ exerciseId: id, name: e.name, split: e.split, sets: e.sets }));
  const splits = [...new Set(exercises.map((e) => e.split))];
  const prevRecords = { ...data.personalRecords };

  mutate((d) => {
    d.workoutHistory.push({ id: uid(), date: todayKey(), splits, exercises });
    recomputeFromHistory(d);
    d.activeSession = null;
  });

  const newData = getData();
  const newPRs = Object.keys(newData.personalRecords).filter((name) => {
    const before = prevRecords[name];
    const after = newData.personalRecords[name];
    return after.date === todayKey() && (!before || before.weight < after.weight || (before.weight === after.weight && before.reps < after.reps));
  });

  toast('Workout saved 💪', 'success');
  newPRs.forEach((name, i) => {
    const r = newData.personalRecords[name];
    setTimeout(() => toast(`🏆 New PR: ${name} ${r.weight}kg × ${r.reps}`, 'achievement'), 500 + i * 600);
  });

  checkBadges();
  renderExercises();
  renderRecords();
}

// ---------------- Render: Train tab ----------------
function renderExercises() {
  const data = getData();
  const list = document.getElementById('exercise-list');
  const exercises = data.workoutSplits[currentSplit];

  if (!exercises.length) {
    list.innerHTML = '<p class="empty-state">No exercises yet. Add one below to get started.</p>';
    return;
  }

  list.innerHTML = exercises.map((ex) => {
    const pr = data.personalRecords[ex.name];
    const sets = sessionSetsFor(ex.id);
    return `
      <div class="exercise-card glass">
        <div class="exercise-head">
          <div>
            <span class="exercise-name">${escapeHtml(ex.name)}</span>
            ${pr ? `<span class="exercise-pr">PR ${pr.weight}kg × ${pr.reps}</span>` : ''}
          </div>
          <div class="exercise-actions">
            <button class="icon-btn ghost" data-del-exercise="${ex.id}" aria-label="Remove exercise"><svg class="icon"><use href="#i-trash"/></svg></button>
          </div>
        </div>
        <div class="set-input-row">
          <input type="number" placeholder="Reps" min="1" data-reps-for="${ex.id}" />
          <input type="number" placeholder="Kg" min="0" step="0.5" data-weight-for="${ex.id}" />
          <button class="btn btn-primary" data-add-set="${ex.id}" data-name="${escapeAttr(ex.name)}">
            <svg class="icon"><use href="#i-plus"/></svg> Set
          </button>
        </div>
        ${sets.length ? `<div class="set-chip-list">${sets.map((s, i) => `
          <span class="set-chip">${s.reps}×${s.weight}kg <button data-remove-set="${ex.id}:${i}" aria-label="Remove set"><svg class="icon" style="width:12px;height:12px"><use href="#i-close"/></svg></button></span>
        `).join('')}</div>` : ''}
      </div>
    `;
  }).join('');
}

function escapeHtml(str) { const div = document.createElement('div'); div.textContent = str; return div.innerHTML; }
function escapeAttr(str) { return escapeHtml(str).replace(/"/g, '&quot;'); }

function openAddExerciseModal() {
  const box = openModal(`
    <p class="modal-title">Add exercise to ${SPLIT_LABEL[currentSplit]}</p>
    <label class="field">
      <span class="field-label">Exercise name</span>
      <input type="text" id="new-exercise-name" placeholder="e.g. Cable Fly" autofocus maxlength="40" />
    </label>
    <div class="modal-actions">
      <button class="btn btn-ghost" data-modal-close>Cancel</button>
      <button class="btn btn-primary" id="save-exercise-btn">Add</button>
    </div>
  `);
  const input = box.querySelector('#new-exercise-name');
  input.focus();
  const save = () => {
    const name = input.value.trim();
    if (!name) return;
    addExercise(name);
    closeModal();
    toast(`${name} added`, 'success');
  };
  box.querySelector('#save-exercise-btn').onclick = save;
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
}

// ---------------- Render: History tab ----------------
function renderHistory() {
  const data = getData();
  const list = document.getElementById('history-list');
  if (!data.workoutHistory.length) {
    list.innerHTML = '<p class="empty-state">No workouts logged yet.</p>';
    return;
  }
  const sorted = [...data.workoutHistory].sort((a, b) => (a.date < b.date ? 1 : -1));
  list.innerHTML = sorted.map((h) => {
    const open = openHistoryIds.has(h.id);
    const splitNames = h.splits.map((s) => SPLIT_LABEL[s] || s).join(' + ');
    const totalSets = h.exercises.reduce((s, e) => s + e.sets.length, 0);
    return `
      <div class="history-card" data-toggle-history="${h.id}">
        <div class="history-item-main">
          <p class="history-item-date">${prettyDate(h.date)} · ${splitNames}</p>
          <p class="history-item-sub">${h.exercises.length} exercises · ${totalSets} sets</p>
        </div>
        <button class="icon-btn ghost" data-del-history="${h.id}" aria-label="Delete"><svg class="icon"><use href="#i-trash"/></svg></button>
        <div class="history-detail ${open ? 'open' : ''}">
          ${h.exercises.map((e) => `<div><strong>${escapeHtml(e.name)}</strong>: ${e.sets.map((s) => `${s.reps}×${s.weight}kg`).join(', ')}</div>`).join('')}
        </div>
      </div>
    `;
  }).join('');
}

async function deleteHistoryEntry(id) {
  const ok = await confirmModal({ title: 'Delete this workout?', message: 'This will also recalculate your streak and personal records.', confirmText: 'Delete', danger: true });
  if (!ok) return;
  mutate((d) => {
    d.workoutHistory = d.workoutHistory.filter((h) => h.id !== id);
    recomputeFromHistory(d);
  });
  renderHistory();
  renderRecords();
  renderExercises();
}

// ---------------- Render: Records tab ----------------
function renderRecords() {
  const data = getData();
  const list = document.getElementById('records-list');
  const entries = Object.entries(data.personalRecords).sort((a, b) => a[0].localeCompare(b[0]));
  if (!entries.length) {
    list.innerHTML = '<p class="empty-state">Finish a workout to start setting records.</p>';
    return;
  }
  list.innerHTML = entries.map(([name, r]) => `
    <div class="record-item">
      <svg class="icon" style="color:var(--violet)"><use href="#i-trophy"/></svg>
      <div class="record-item-main">
        <p class="record-item-name">${escapeHtml(name)}</p>
        <p class="record-item-sub">${prettyDate(r.date)}</p>
      </div>
      <span class="stat-value" style="font-size:16px">${r.weight}kg×${r.reps}</span>
    </div>
  `).join('');
}

// ---------------- Init ----------------
export function initWorkout() {
  onScreenShow('workout', () => { renderExercises(); renderHistory(); renderRecords(); });

  document.getElementById('split-row').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-split]');
    if (!btn) return;
    currentSplit = btn.dataset.split;
    document.querySelectorAll('#split-row .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    renderExercises();
  });

  document.getElementById('workout-subtabs').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-subtab]');
    if (!btn) return;
    document.querySelectorAll('#workout-subtabs .tab-btn').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.subtab-panel').forEach((p) => p.classList.remove('active'));
    document.getElementById(`workout-panel-${btn.dataset.subtab}`).classList.add('active');
  });

  document.getElementById('add-exercise-btn').addEventListener('click', openAddExerciseModal);
  document.getElementById('finish-workout-btn').addEventListener('click', finishWorkout);

  const exerciseList = document.getElementById('exercise-list');
  exerciseList.addEventListener('click', (e) => {
    const addBtn = e.target.closest('[data-add-set]');
    if (addBtn) {
      const id = addBtn.dataset.addSet;
      const name = addBtn.dataset.name;
      const repsInput = exerciseList.querySelector(`[data-reps-for="${id}"]`);
      const weightInput = exerciseList.querySelector(`[data-weight-for="${id}"]`);
      const reps = parseInt(repsInput.value, 10);
      const weight = parseFloat(weightInput.value) || 0;
      if (!reps || reps <= 0) { toast('Enter reps', 'error'); return; }
      addSet(id, name, reps, weight);
      repsInput.value = ''; weightInput.value = '';
      repsInput.focus();
      return;
    }
    const delEx = e.target.closest('[data-del-exercise]');
    if (delEx) { deleteExercise(delEx.dataset.delExercise); return; }
    const remSet = e.target.closest('[data-remove-set]');
    if (remSet) {
      const [id, idx] = remSet.dataset.removeSet.split(':');
      removeSet(id, parseInt(idx, 10));
    }
  });

  const historyList = document.getElementById('history-list');
  historyList.addEventListener('click', (e) => {
    const del = e.target.closest('[data-del-history]');
    if (del) { e.stopPropagation(); deleteHistoryEntry(del.dataset.delHistory); return; }
    const toggle = e.target.closest('[data-toggle-history]');
    if (toggle) {
      const id = toggle.dataset.toggleHistory;
      openHistoryIds.has(id) ? openHistoryIds.delete(id) : openHistoryIds.add(id);
      renderHistory();
    }
  });

  renderExercises();
  renderHistory();
  renderRecords();
}
