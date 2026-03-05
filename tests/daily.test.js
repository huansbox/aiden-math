import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadProgress, saveResult, isDaily, getDailySummary, DAILY_GOAL, getMilestone, getMilestoneBadge } from '../js/daily.js';

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

describe('getMilestone', () => {
  it('returns null when no milestone is crossed', () => {
    expect(getMilestone(3, 4)).toBeNull();
  });

  it('returns 5 when crossing from 4 to 5', () => {
    expect(getMilestone(4, 5)).toBe(5);
  });

  it('returns 10 when crossing from 9 to 10', () => {
    expect(getMilestone(9, 10)).toBe(10);
  });

  it('returns 15 when crossing from 14 to 15', () => {
    expect(getMilestone(14, 15)).toBe(15);
  });

  it('returns 20 when crossing from 19 to 20', () => {
    expect(getMilestone(19, 20)).toBe(20);
  });

  it('returns 30 when crossing from 28 to 30', () => {
    expect(getMilestone(28, 30)).toBe(30);
  });

  it('returns 100 when crossing from 99 to 100', () => {
    expect(getMilestone(99, 100)).toBe(100);
  });

  it('returns null when already past milestone', () => {
    expect(getMilestone(21, 22)).toBeNull();
  });

  it('returns null when both before and after are between milestones', () => {
    expect(getMilestone(31, 32)).toBeNull();
  });
});

describe('getMilestoneBadge', () => {
  it('returns null for totalProblems below 5', () => {
    expect(getMilestoneBadge(3)).toBeNull();
  });

  it('returns bronze for 5-9', () => {
    expect(getMilestoneBadge(5)).toEqual({ emoji: '🥉', label: '5 題' });
    expect(getMilestoneBadge(9)).toEqual({ emoji: '🥉', label: '5 題' });
  });

  it('returns silver for 10-14', () => {
    expect(getMilestoneBadge(10)).toEqual({ emoji: '🥈', label: '10 題' });
  });

  it('returns gold for 15-19', () => {
    expect(getMilestoneBadge(15)).toEqual({ emoji: '🥇', label: '15 題' });
  });

  it('returns medal for 20-29', () => {
    expect(getMilestoneBadge(25)).toEqual({ emoji: '🏅', label: '20 題' });
  });

  it('returns medal for 50-59', () => {
    expect(getMilestoneBadge(55)).toEqual({ emoji: '🏅', label: '50 題' });
  });

  it('returns diamond for 100+', () => {
    expect(getMilestoneBadge(100)).toEqual({ emoji: '💎', label: '100 題' });
    expect(getMilestoneBadge(150)).toEqual({ emoji: '💎', label: '100 題' });
  });
});
