// storage.js — single source of truth for all persisted data.
// Everything lives in one localStorage key as JSON. No network, no database.

export const DATA_KEY = 'imranFitnessData';
export const AUTH_KEY = 'imranFitnessAuth';
export const SESSION_KEY = 'imranFitnessSession';

export function uid() {
  if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9);
}

export function todayKey(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); // normalize to local date
  return d.toISOString().slice(0, 10);
}

export function addDays(dateKeyStr, n) {
  const d = new Date(dateKeyStr + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return todayKey(d);
}

export function prettyDate(dateKeyStr) {
  const d = new Date(dateKeyStr + 'T00:00:00');
  const today = todayKey();
  if (dateKeyStr === today) return 'Today';
  if (dateKeyStr === addDays(today, -1)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function defaultSplits() {
  const mk = (name) => ({ id: uid(), name, custom: false });
  return {
    push: ['Bench Press', 'Overhead Press', 'Incline Dumbbell Press', 'Tricep Pushdown', 'Lateral Raise'].map(mk),
    pull: ['Deadlift', 'Pull-Up', 'Barbell Row', 'Lat Pulldown', 'Bicep Curl'].map(mk),
    legs: ['Squat', 'Leg Press', 'Romanian Deadlift', 'Leg Curl', 'Calf Raise'].map(mk),
  };
}

export function defaultData() {
  return {
    profile: {
      heightCm: 175,
      startWeight: 60,
      targetWeight: 75,
      dailyCalorieGoal: 3000,
      dailyProteinGoal: 150,
      dailyWaterGoalMl: 3000,
      workoutDaysPerWeek: 6,
      waterReminderEnabled: false,
      waterReminderIntervalMin: 60,
    },
    weightLogs: [],
    measurements: [],
    workoutSplits: defaultSplits(),
    workoutHistory: [],
    personalRecords: {},
    activeSession: null,
    diet: {},
    water: {},
    photos: [],
    streak: { count: 0, lastWorkoutDate: null },
    badges: { unlocked: {} },
    theme: 'dark',
    meta: { createdAt: new Date().toISOString() },
  };
}

function deepMerge(base, incoming) {
  if (Array.isArray(base)) return incoming !== undefined ? incoming : base;
  if (typeof base === 'object' && base !== null) {
    const out = { ...base };
    if (incoming && typeof incoming === 'object') {
      for (const k of Object.keys(incoming)) {
        out[k] = deepMerge(base[k], incoming[k]);
      }
    }
    return out;
  }
  return incoming !== undefined ? incoming : base;
}

let cache = null;

export function loadData() {
  if (cache) return cache;
  try {
    const raw = localStorage.getItem(DATA_KEY);
    cache = raw ? deepMerge(defaultData(), JSON.parse(raw)) : defaultData();
  } catch (e) {
    console.error('Failed to load data, resetting.', e);
    cache = defaultData();
  }
  return cache;
}

export function saveData() {
  try {
    localStorage.setItem(DATA_KEY, JSON.stringify(cache));
    return true;
  } catch (e) {
    console.error('Failed to save data (storage may be full).', e);
    return false;
  }
}

export function getData() {
  return cache || loadData();
}

// Mutate the in-memory store with fn(data), then persist immediately.
export function mutate(fn) {
  const data = getData();
  fn(data);
  saveData();
  return data;
}

export function resetAllData() {
  cache = defaultData();
  saveData();
}

export function exportBackup() {
  const data = getData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = todayKey();
  a.href = url;
  a.download = `imran-fitness-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function importBackup(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid file');
        cache = deepMerge(defaultData(), parsed);
        saveData();
        resolve(cache);
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// ---- Auth state (separate key, never touched by backup restore) ----
export function getAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : { failedAttempts: 0, lockUntil: null };
  } catch (e) {
    return { failedAttempts: 0, lockUntil: null };
  }
}

export function saveAuthState(state) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
}

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  } catch (e) {
    return null;
  }
}

export function setSession(value) {
  if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  else localStorage.removeItem(SESSION_KEY);
}
