// badges-screen.js — renders the achievement grid.
import { onScreenShow } from './ui.js';
import { getBadgeState } from './badges.js';

function renderBadges() {
  const grid = document.getElementById('badge-grid');
  const badges = getBadgeState();
  grid.innerHTML = badges.map((b) => `
    <div class="badge-card glass ${b.unlocked ? 'unlocked' : 'locked'}">
      <span class="badge-emoji">${b.emoji}</span>
      <span class="badge-title">${b.title}</span>
      <span class="badge-desc">${b.desc}</span>
      ${b.unlocked ? `<span style="font-size:10px;color:var(--teal);">Unlocked</span>` : `<span style="font-size:10px;color:var(--text-3);">Locked</span>`}
    </div>
  `).join('');
}

export function initBadgesScreen() {
  onScreenShow('badges', renderBadges);
}
