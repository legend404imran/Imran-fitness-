// badges_screen.js — renders the achievements grid on the badges screen.
import { onScreenShow } from './ui.js';
import { getBadgeState } from './badges.js';
import { prettyDate } from './storage.js';

export function renderBadges() {
  const badges = getBadgeState();
  const grid = document.getElementById('badge-grid');
  const unlocked = badges.filter((b) => b.unlocked || b.achieved);
  const locked = badges.filter((b) => !b.unlocked && !b.achieved);

  grid.innerHTML = [...unlocked, ...locked].map((b) => {
    const isUnlocked = b.unlocked || b.achieved;
    return (
      '<div class="badge-card glass ' + (isUnlocked ? 'unlocked' : 'locked') + '">' +
      '<span class="badge-emoji">' + b.emoji + '</span>' +
      '<span class="badge-title">' + b.title + '</span>' +
      '<span class="badge-desc">' + b.desc + (b.unlockedAt ? '<br><small>' + prettyDate(b.unlockedAt.slice(0,10)) + '</small>' : '') + '</span>' +
      '</div>'
    );
  }).join('');
}

export function initBadges() {
  onScreenShow('badges', renderBadges);
  renderBadges();
}
