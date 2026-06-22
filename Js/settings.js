// settings.js — profile & goals form, theme controls, backup export/import, reset.
import { getData, mutate, exportBackup, importBackup, resetAllData } from './storage.js';
import { toast, onScreenShow, confirmModal, toggleTheme, setTheme, applyTheme } from './ui.js';

function populateForm() {
  const data = getData();
  const p = data.profile;
  const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
  set('set-height', p.heightCm);
  set('set-target', p.targetWeight);
  set('set-calories', p.dailyCalorieGoal);
  set('set-protein', p.dailyProteinGoal);
  set('set-water', p.dailyWaterGoalMl);
  set('set-workout-days', p.workoutDaysPerWeek);
  const toggle = document.getElementById('settings-theme-toggle');
  if (toggle) toggle.checked = (data.theme === 'dark');
}

export function initSettings() {
  onScreenShow('settings', populateForm);

  document.getElementById('profile-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const get = (id) => parseFloat(document.getElementById(id).value) || 0;
    mutate((d) => {
      d.profile.heightCm = get('set-height') || d.profile.heightCm;
      d.profile.targetWeight = get('set-target') || d.profile.targetWeight;
      d.profile.dailyCalorieGoal = get('set-calories') || d.profile.dailyCalorieGoal;
      d.profile.dailyProteinGoal = get('set-protein') || d.profile.dailyProteinGoal;
      d.profile.dailyWaterGoalMl = get('set-water') || d.profile.dailyWaterGoalMl;
      d.profile.workoutDaysPerWeek = get('set-workout-days') || d.profile.workoutDaysPerWeek;
    });
    toast('Settings saved', 'success');
    populateForm();
  });

  document.getElementById('settings-theme-toggle').addEventListener('change', (e) => {
    setTheme(e.target.checked ? 'dark' : 'light');
  });

  document.getElementById('export-btn').addEventListener('click', () => {
    exportBackup();
    toast('Backup exported — check your downloads');
  });

  document.getElementById('import-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await importBackup(file);
      toast('Backup restored! Refreshing…', 'success');
      setTimeout(() => location.reload(), 1200);
    } catch (err) {
      toast('Restore failed — invalid backup file', 'error');
    }
    e.target.value = '';
  });

  document.getElementById('reset-btn').addEventListener('click', async () => {
    const ok = await confirmModal({
      title: 'Erase all data?',
      message: 'This will permanently delete every log, photo, measurement and setting. Export a backup first if you want to keep your data.',
      confirmText: 'Erase everything',
      danger: true,
    });
    if (!ok) return;
    resetAllData();
    toast('All data erased. Refreshing…');
    setTimeout(() => location.reload(), 1200);
  });

  populateForm();
}
