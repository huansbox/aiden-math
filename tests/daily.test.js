import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadProgress, saveResult, isDaily, getDailySummary, DAILY_GOAL } from '../js/daily.js';

// Mock localStorage
const store = {};
const mockStorage = {
  getItem: vi.fn(key => store[key] ?? null),
  setItem: vi.fn((key, val) => { store[key] = val; }),
};

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  mockStorage.getItem.mockClear();
  mockStorage.setItem.mockClear();
});

describe('loadProgress', () => {
  it('returns fresh state when localStorage is empty', () => {
    const p = loadProgress(mockStorage, '2026-03-05');
    expect(p.date).toBe('2026-03-05');
    expect(p.dailyCompleted).toBe(0);
    expect(p.dailyResults).toEqual([]);
    expect(p.totalProblems).toBe(0);
    expect(p.totalStars).toBe(0);
  });

  it('returns saved state when date matches', () => {
    store['aiden-math-progress'] = JSON.stringify({
      date: '2026-03-05', dailyCompleted: 2,
      dailyResults: [{ stars: 3, errors: 0 }, { stars: 2, errors: 1 }],
      totalProblems: 10, totalStars: 25,
    });
    const p = loadProgress(mockStorage, '2026-03-05');
    expect(p.dailyCompleted).toBe(2);
    expect(p.totalProblems).toBe(10);
  });

  it('resets daily but keeps totals when date changes', () => {
    store['aiden-math-progress'] = JSON.stringify({
      date: '2026-03-04', dailyCompleted: 5,
      dailyResults: [{ stars: 3, errors: 0 }, { stars: 3, errors: 0 }, { stars: 2, errors: 1 }, { stars: 3, errors: 0 }, { stars: 1, errors: 4 }],
      totalProblems: 10, totalStars: 25,
    });
    const p = loadProgress(mockStorage, '2026-03-05');
    expect(p.date).toBe('2026-03-05');
    expect(p.dailyCompleted).toBe(0);
    expect(p.dailyResults).toEqual([]);
    expect(p.totalProblems).toBe(10);
    expect(p.totalStars).toBe(25);
  });
});

describe('saveResult', () => {
  it('increments dailyCompleted and appends result', () => {
    const p = { date: '2026-03-05', dailyCompleted: 1, dailyResults: [{ stars: 3, errors: 0 }], totalProblems: 5, totalStars: 13 };
    const updated = saveResult(mockStorage, p, { stars: 2, errors: 2 });
    expect(updated.dailyCompleted).toBe(2);
    expect(updated.dailyResults).toHaveLength(2);
    expect(updated.totalProblems).toBe(6);
    expect(updated.totalStars).toBe(15);
    expect(mockStorage.setItem).toHaveBeenCalledWith('aiden-math-progress', expect.any(String));
  });
});

describe('isDaily', () => {
  it('returns true when dailyCompleted < DAILY_GOAL', () => {
    expect(isDaily({ dailyCompleted: 3 })).toBe(true);
  });

  it('returns false when dailyCompleted >= DAILY_GOAL', () => {
    expect(isDaily({ dailyCompleted: 5 })).toBe(false);
  });
});

describe('getDailySummary', () => {
  it('returns total stars for today', () => {
    const p = {
      dailyResults: [{ stars: 3, errors: 0 }, { stars: 2, errors: 1 }, { stars: 3, errors: 0 }, { stars: 3, errors: 0 }, { stars: 1, errors: 5 }],
    };
    const summary = getDailySummary(p);
    expect(summary.totalStars).toBe(12);
    expect(summary.problemCount).toBe(5);
  });
});
