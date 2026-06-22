// settings.js — profile & goals form, theme, backup export/import, data reset.
import { getData, mutate, exportBackup, importBackup, resetAllData } from './storage.js';
import { toast, onScreenShow, setTheme, confirmModal, showScreen } from './ui.js';

function renderSettings() {
  const data = getData();
  const p = data.profile;
  const fieldMap = {
    'set-height': p.heightCm,
    'set-target': p.targetWeight,
    'set-calories': p.dailyCalorieGoal,
    'set-protein': p.dailyProteinGoal,
    'set-water': p.dailyWaterGoalMl,
    'set-workout-days': p.workoutDaysPerWeek,
  };
  Object.entries(fieldMap).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = val;
  });
  const toggle = document.getElementById('settings-theme-toggle');
  if (toggle) toggle.checked = data.theme === 'dark';
}

export function initSettings() {
  onScreenShow('settings', renderSettings);

  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    mutate((d) => {
      const g = (id) => parseFloat(document.getElementById(id).value);
      const gi = (id) => parseInt(document.getElementById(id).value, 10);
      if (g('set-height') > 0) d.profile.heightCm = g('set-height');
      if (g('set-target') > 0) d.profile.targetWeight = g('set-target');
      if (g('set-calories') > 0) d.profile.dailyCalorieGoal = g('set-calories');
      if (g('set-protein') >= 0) d.profile.dailyProteinGoal = g('set-protein');
      if (g('set-water') > 0) d.profile.dailyWaterGoalMl = g('set-water');
      if (gi('set-workout-days') > 0) d.profile.workoutDaysPerWeek = gi('set-workout-days');
    });
    toast('Settings saved ✓', 'success');
  });

  document.getElementById('settings-theme-toggle').addEventListener('change', (e) => {
    setTheme(e.target.checked ? 'dark' : 'light');
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    exportBackup();
    toast('Backup downloaded', 'success');
  });

  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await confirmModal({ title: 'Restore backup?', message: 'This will replace all current data with the backup file.', confirmText: 'Restore' });
    if (!ok) { e.target.value = ''; return; }
    try {
      await importBackup(file);
      toast('Backup restored ✓', 'success');
      renderSettings();
      showScreen('dashboard');
    } catch (err) {
      toast('Invalid backup file', 'error');
    }
    e.target.value = '';
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    const ok = await confirmModal({ title: 'Erase all data?', message: 'This permanently deletes every entry, workout, and measurement. It cannot be undone.', confirmText: 'Erase everything', danger: true });
    if (!ok) return;
    resetAllData();
    toast('All data cleared');
    renderSettings();
    showScreen('dashboard');
    setTimeout(() => window.location.reload(), 600);
  });

  renderSettings();
}
