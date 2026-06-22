// badges.js — achievement badges. Call checkBadges() after any meaningful data change;
// it figures out what's newly unlocked, persists it, and toasts a celebration.
import { getData, mutate } from './storage.js';
import { toast } from './ui.js';

export const BADGES = [
  { id: 'first_workout', emoji: '🏋️', title: 'First Rep', desc: 'Logged your first workout', test: (d, s) => s.totalWorkouts >= 1 },
  { id: 'streak_3', emoji: '🔥', title: 'On a Roll', desc: '3-day workout streak', test: (d, s) => s.streak >= 3 },
  { id: 'streak_7', emoji: '🔥', title: 'Week Warrior', desc: '7-day workout streak', test: (d, s) => s.streak >= 7 },
  { id: 'streak_30', emoji: '🔥', title: 'Unstoppable', desc: '30-day workout streak', test: (d, s) => s.streak >= 30 },
  { id: 'first_pr', emoji: '🏆', title: 'New Record', desc: 'Set your first personal record', test: (d, s) => s.prCount >= 1 },
  { id: 'pr_5', emoji: '🥇', title: 'Record Breaker', desc: 'Earned 5 personal records', test: (d, s) => s.prCount >= 5 },
  { id: 'weigh_5', emoji: '⚖️', title: 'On Track', desc: 'Logged your weight 5 times', test: (d, s) => s.weightLogCount >= 5 },
  { id: 'halfway', emoji: '🎯', title: 'Halfway There', desc: 'Reached 50% of your weight goal', test: (d, s) => s.weightProgressPct >= 50 },
  { id: 'goal_crusher', emoji: '👑', title: 'Goal Crusher', desc: 'Reached your target weight', test: (d, s) => s.weightProgressPct >= 100 },
  { id: 'hydrated', emoji: '💧', title: 'Well Hydrated', desc: 'Hit your water goal 7 times', test: (d, s) => s.waterGoalHitDays >= 7 },
  { id: 'snapshot', emoji: '📸', title: 'Snapshot', desc: 'Uploaded your first progress photo', test: (d, s) => s.photoCount >= 1 },
  { id: 'measured_up', emoji: '📏', title: 'Measured Up', desc: 'Logged your body measurements', test: (d, s) => s.measurementCount >= 1 },
  { id: 'nutrition_7', emoji: '🍽️', title: 'Nutrition Nerd', desc: 'Logged meals on 7 different days', test: (d, s) => s.dietLoggedDays >= 7 },
];

function computeStats(data) {
  const totalWorkouts = data.workoutHistory.length;
  const streak = data.streak.count || 0;
  const prCount = Object.keys(data.personalRecords).length;
  const weightLogCount = data.weightLogs.length;

  const start = data.profile.startWeight;
  const target = data.profile.targetWeight;
  const latest = weightLogCount ? data.weightLogs[data.weightLogs.length - 1].weight : start;
  let weightProgressPct = 0;
  if (target !== start) weightProgressPct = ((latest - start) / (target - start)) * 100;
  weightProgressPct = Math.max(0, Math.min(150, weightProgressPct));

  const goal = data.profile.dailyWaterGoalMl;
  const waterGoalHitDays = Object.values(data.water).filter((d) => d.total >= goal).length;

  const dietLoggedDays = Object.values(data.diet).filter((day) =>
    ['breakfast', 'lunch', 'dinner', 'snacks'].some((m) => (day[m] || []).length > 0)
  ).length;

  return {
    totalWorkouts, streak, prCount, weightLogCount, weightProgressPct,
    waterGoalHitDays, photoCount: data.photos.length, measurementCount: data.measurements.length,
    dietLoggedDays,
  };
}

export function getBadgeState() {
  const data = getData();
  const stats = computeStats(data);
  return BADGES.map((b) => ({
    ...b,
    unlocked: !!data.badges.unlocked[b.id],
    unlockedAt: data.badges.unlocked[b.id] || null,
    achieved: b.test(data, stats),
  }));
}

export function checkBadges() {
  const data = getData();
  const stats = computeStats(data);
  const newlyUnlocked = [];

  BADGES.forEach((b) => {
    const already = data.badges.unlocked[b.id];
    if (!already && b.test(data, stats)) {
      newlyUnlocked.push(b);
    }
  });

  if (newlyUnlocked.length) {
    mutate((d) => {
      newlyUnlocked.forEach((b) => { d.badges.unlocked[b.id] = new Date().toISOString(); });
    });
    newlyUnlocked.forEach((b, i) => {
      setTimeout(() => toast(`${b.emoji} Achievement unlocked: ${b.title}`, 'achievement'), i * 600);
    });
  }
  return newlyUnlocked;
}
