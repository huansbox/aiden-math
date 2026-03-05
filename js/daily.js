const KEY = 'aiden-math-progress';
export const DAILY_GOAL = 5;

function freshState(date) {
  return { date, dailyCompleted: 0, dailyResults: [], totalProblems: 0, totalStars: 0 };
}

export function loadProgress(storage, today) {
  const raw = storage.getItem(KEY);
  if (!raw) return freshState(today);

  const saved = JSON.parse(raw);
  if (saved.date === today) return saved;

  // New day: keep totals, reset daily
  return {
    date: today,
    dailyCompleted: 0,
    dailyResults: [],
    totalProblems: saved.totalProblems || 0,
    totalStars: saved.totalStars || 0,
  };
}

export function saveResult(storage, progress, result) {
  const updated = {
    ...progress,
    dailyCompleted: progress.dailyCompleted + 1,
    dailyResults: [...progress.dailyResults, result],
    totalProblems: progress.totalProblems + 1,
    totalStars: progress.totalStars + result.stars,
  };
  storage.setItem(KEY, JSON.stringify(updated));
  return updated;
}

export function isDaily(progress) {
  return progress.dailyCompleted < DAILY_GOAL;
}

export function getDailySummary(progress) {
  const totalStars = progress.dailyResults.reduce((sum, r) => sum + r.stars, 0);
  return { totalStars, problemCount: progress.dailyResults.length };
}
