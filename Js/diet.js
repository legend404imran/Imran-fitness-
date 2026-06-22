// diet.js — meal logging (breakfast/lunch/dinner/snacks), calories & protein totals.
import { getData, mutate, todayKey, addDays, prettyDate, uid } from './storage.js';
import { toast, onScreenShow, pct } from './ui.js';
import { checkBadges } from './badges.js';

const MEALS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
];

let viewDate = todayKey();
const openMeals = new Set(['breakfast']);

function getDay(dateKey) {
  const data = getData();
  return data.diet[dateKey] || { breakfast: [], lunch: [], dinner: [], snacks: [] };
}

export function getDayTotals(dateKey) {
  const day = getDay(dateKey);
  let calories = 0, protein = 0;
  MEALS.forEach((m) => (day[m.key] || []).forEach((item) => { calories += item.calories; protein += item.protein; }));
  return { calories: Math.round(calories), protein: Math.round(protein) };
}

function addFoodItem(mealKey, name, calories, protein) {
  mutate((d) => {
    if (!d.diet[viewDate]) d.diet[viewDate] = { breakfast: [], lunch: [], dinner: [], snacks: [] };
    d.diet[viewDate][mealKey].push({ id: uid(), name, calories, protein });
  });
  checkBadges();
  renderDiet();
}

function removeFoodItem(mealKey, itemId) {
  mutate((d) => {
    if (!d.diet[viewDate]) return;
    d.diet[viewDate][mealKey] = d.diet[viewDate][mealKey].filter((i) => i.id !== itemId);
  });
  renderDiet();
}

function mealCalories(mealItems) {
  return Math.round(mealItems.reduce((s, i) => s + i.calories, 0));
}

export function renderDiet() {
  const data = getData();
  document.getElementById('diet-date-label').textContent = prettyDate(viewDate);
  document.getElementById('diet-next-day').disabled = viewDate >= todayKey();
  document.getElementById('diet-next-day').style.opacity = viewDate >= todayKey() ? 0.4 : 1;

  const totals = getDayTotals(viewDate);
  const calGoal = data.profile.dailyCalorieGoal;
  const proteinGoal = data.profile.dailyProteinGoal;
  document.getElementById('diet-total-calories').textContent = totals.calories;
  document.getElementById('diet-goal-calories').textContent = calGoal;
  document.getElementById('diet-bar-calories').style.width = `${Math.min(100, pct(totals.calories, calGoal))}%`;
  document.getElementById('diet-total-protein').textContent = totals.protein;
  document.getElementById('diet-goal-protein').textContent = proteinGoal;
  document.getElementById('diet-bar-protein').style.width = `${Math.min(100, pct(totals.protein, proteinGoal))}%`;

  const day = getDay(viewDate);
  const container = document.getElementById('meal-sections');
  container.innerHTML = MEALS.map((m) => {
    const items = day[m.key] || [];
    const isOpen = openMeals.has(m.key);
    return `
      <div class="meal-card glass ${isOpen ? 'open' : ''}" data-meal="${m.key}">
        <div class="meal-head" data-meal-toggle="${m.key}">
          <div class="meal-head-left">
            <strong class="meal-title">${m.label}</strong>
            <span class="meal-kcal">${mealCalories(items)} kcal · ${items.length} item${items.length === 1 ? '' : 's'}</span>
          </div>
          <svg class="icon meal-chevron"><use href="#i-arrow-right"/></svg>
        </div>
        <div class="meal-body">
          ${items.length ? items.map((i) => `
            <div class="food-item">
              <span class="food-item-name">${escapeHtml(i.name)}</span>
              <span class="food-item-meta">${i.calories} kcal · ${i.protein}g</span>
              <button class="icon-btn ghost" data-remove-food="${m.key}:${i.id}" aria-label="Remove"><svg class="icon"><use href="#i-trash"/></svg></button>
            </div>
          `).join('') : '<p class="empty-state">Nothing logged yet.</p>'}
          <form class="food-add-form" data-add-food="${m.key}">
            <input type="text" placeholder="Food name" required maxlength="40" />
            <input type="number" placeholder="kcal" min="0" required />
            <input type="number" placeholder="protein g" min="0" required />
            <button type="submit" class="icon-btn" aria-label="Add"><svg class="icon"><use href="#i-plus"/></svg></button>
          </form>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function initDiet() {
  onScreenShow('diet', () => { renderDiet(); });

  document.getElementById('diet-prev-day').addEventListener('click', () => { viewDate = addDays(viewDate, -1); renderDiet(); });
  document.getElementById('diet-next-day').addEventListener('click', () => {
    if (viewDate < todayKey()) { viewDate = addDays(viewDate, 1); renderDiet(); }
  });

  const container = document.getElementById('meal-sections');
  container.addEventListener('click', (e) => {
    const toggle = e.target.closest('[data-meal-toggle]');
    if (toggle) {
      const key = toggle.dataset.mealToggle;
      openMeals.has(key) ? openMeals.delete(key) : openMeals.add(key);
      renderDiet();
      return;
    }
    const remove = e.target.closest('[data-remove-food]');
    if (remove) {
      const [mealKey, itemId] = remove.dataset.removeFood.split(':');
      removeFoodItem(mealKey, itemId);
    }
  });

  container.addEventListener('submit', (e) => {
    const form = e.target.closest('[data-add-food]');
    if (!form) return;
    e.preventDefault();
    const mealKey = form.dataset.addFood;
    const [nameInput, calInput, proteinInput] = form.querySelectorAll('input');
    const name = nameInput.value.trim();
    const calories = parseFloat(calInput.value) || 0;
    const protein = parseFloat(proteinInput.value) || 0;
    if (!name) return;
    openMeals.add(mealKey);
    addFoodItem(mealKey, name, calories, protein);
    toast(`Added ${name}`, 'success');
  });

  renderDiet();
}
