// auth.js — login credentials + progressive lockout.
// Lock schedule (seconds) by consecutive failed attempt count:
// 1st fail: 30s, 2nd: 1min, 3rd: 5min, then it keeps growing.
import { getAuthState, saveAuthState, getSession, setSession } from './storage.js';

const USERNAME = 'Imran';
const PASSWORD = '1234';

const LOCK_SCHEDULE_SEC = [30, 60, 300, 600, 1800, 3600, 7200, 14400, 28800, 86400];

function lockDurationFor(failCount) {
  const idx = Math.min(failCount - 1, LOCK_SCHEDULE_SEC.length - 1);
  return LOCK_SCHEDULE_SEC[idx];
}

export function lockStatus() {
  const state = getAuthState();
  if (state.lockUntil && state.lockUntil > Date.now()) {
    return { locked: true, remainingMs: state.lockUntil - Date.now(), failedAttempts: state.failedAttempts };
  }
  return { locked: false, remainingMs: 0, failedAttempts: state.failedAttempts };
}

export function attemptLogin(username, password) {
  const status = lockStatus();
  if (status.locked) {
    return { success: false, locked: true, remainingMs: status.remainingMs };
  }

  const ok = username.trim() === USERNAME && password === PASSWORD;
  const state = getAuthState();

  if (ok) {
    saveAuthState({ failedAttempts: 0, lockUntil: null });
    setSession({ loggedIn: true, since: Date.now() });
    return { success: true };
  }

  const failedAttempts = (state.failedAttempts || 0) + 1;
  const lockSeconds = lockDurationFor(failedAttempts);
  const lockUntil = Date.now() + lockSeconds * 1000;
  saveAuthState({ failedAttempts, lockUntil });
  return { success: false, locked: false, failedAttempts, lockSeconds };
}

export function isLoggedIn() {
  const s = getSession();
  return !!(s && s.loggedIn);
}

export function logout() {
  setSession(null);
}

export function formatRemaining(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
