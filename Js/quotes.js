// quotes.js — a deterministic "quote of the day" so it stays the same all day.
const QUOTES = [
  "Discipline is choosing what you want most over what you want now.",
  "Every meal, every set, every rep — it all adds up.",
  "Skinny to strong isn't a phase, it's a habit you repeat daily.",
  "You don't have to be extreme, just consistent.",
  "Eat like it matters. Train like it matters. It does.",
  "The body achieves what the mind believes.",
  "Small daily gains compound into a totally different you.",
  "Progress, not perfection.",
  "Show up today — future you is counting on it.",
  "Strength is built one uncomfortable rep at a time.",
  "Your only competition is who you were yesterday.",
  "Calories in, effort up — the gains will follow.",
  "Rest is part of the program, not a break from it.",
  "You're not behind. You're building.",
  "A good plan today beats a perfect plan someday.",
  "Discomfort today, confidence tomorrow.",
  "Track it to stack it — log it and watch it grow.",
  "Hydrate. Lift. Repeat.",
  "The weight on the bar is temporary. The strength is permanent.",
  "Nobody gets strong on their best days alone — show up on the bad ones too.",
  "Fuel the body you're building.",
  "Consistency beats intensity, every single time.",
  "One more rep. One more glass of water. One more good choice.",
  "Your streak is a promise you keep to yourself.",
  "Big changes are just small ones, repeated.",
  "You're allowed to go slow. Just don't stop.",
  "Strong isn't a size — it's a habit.",
  "Today's log is tomorrow's proof.",
  "Better fed, better rested, better lifted.",
  "Build the body that carries your goals.",
];

function dayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}

export function getTodayQuote() {
  const idx = dayOfYear(new Date()) % QUOTES.length;
  return QUOTES[idx];
}
