# 每日練習模式 + localStorage 歷史紀錄 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 每日預設 5 題練習，完成有特殊回饋，之後進入自由練習模式。用 localStorage 記錄每日進度，隔天自動重置。

**Architecture:** 新增 `js/daily.js` 純邏輯模組（可測試）管理 localStorage 讀寫和每日狀態。`app.js` 根據 daily 狀態切換模式（每日練習 → 完成回饋 → 自由練習）。UI 在 header 顯示進度（如「第 3/5 題」），完成時顯示每日總結畫面。

**Tech Stack:** localStorage（瀏覽器原生）、Vitest

---

## 核心概念

### 狀態流
```
開啟網頁 → 讀取 localStorage
  ├─ 今日尚未完成 5 題 → 每日練習模式（顯示進度 X/5）
  ├─ 今日已完成 5 題 → 自由練習模式（顯示「自由練習」）
  └─ 隔天 → 重置為新的每日練習
```

### localStorage schema
```js
{
  date: '2026-03-05',         // ISO date string，用來判斷是否隔天
  dailyCompleted: 3,          // 今日已完成題數
  dailyResults: [             // 每題結果
    { stars: 3, errors: 0 },
    { stars: 2, errors: 1 },
    { stars: 3, errors: 0 },
  ],
  totalProblems: 42,          // 歷史總題數（跨天累計）
  totalStars: 118,            // 歷史總星星數
}
```

Key: `aiden-math-progress`

### 每日完成回饋

完成第 5 題後，顯示一個總結畫面（覆蓋在 card 上方），持續 3 秒：
- 「今日練習完成！」大字
- 今日得到的星星總數（如「⭐ × 13」）
- 3 秒後自動切換到自由練習模式

自由練習模式和目前行為完全一致，只是 header 進度文字改為「自由練習」。

---

### Task 1: 建立 daily.js 模組（TDD）

**Files:**
- Create: `js/daily.js`
- Create: `tests/daily.test.js`

**Step 1: 寫測試**

```js
// tests/daily.test.js
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
```

**Step 2: 跑測試確認失敗**

```bash
npm test
```

Expected: daily.test.js 全部 FAIL（模組不存在）

**Step 3: 實作 daily.js**

```js
// js/daily.js

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
```

**Step 4: 跑測試確認通過**

```bash
npm test
```

Expected: 所有測試 passing（原 23 + 新 daily tests）

**Step 5: Commit**

```bash
git add js/daily.js tests/daily.test.js
git commit -m "feat: add daily.js with localStorage progress tracking (TDD)"
```

---

### Task 2: 整合每日模式到 app.js

**Files:**
- Modify: `js/app.js`

**Step 1: Import daily 模組**

在 `js/app.js` 第 1 行 import 後面加：

```js
import { loadProgress, saveResult, isDaily, getDailySummary, DAILY_GOAL } from './daily.js';
```

**Step 2: 初始化 progress 狀態**

在 `js/app.js` 的 `let streak = 0;`（第 11 行）後面加：

```js
let progress = loadProgress(localStorage, new Date().toISOString().slice(0, 10));
```

**Step 3: 修改 onProblemComplete，儲存結果 + 判斷每日完成**

將 `onProblemComplete` 函式（第 158-167 行）替換為：

```js
function onProblemComplete() {
  const stars = getStars(state.errors);
  streak++;

  progress = saveResult(localStorage, progress, { stars, errors: state.errors });

  updateStreak();
  showStars(stars);
  updateProgress();

  if (progress.dailyCompleted === DAILY_GOAL) {
    showDailyComplete();
  } else {
    showCelebration();
    setTimeout(startNewProblem, 1500);
  }
}
```

**Step 4: 新增 updateProgress 函式**

在 `showCelebration` 函式後面加：

```js
function updateProgress() {
  const progressEl = document.getElementById('progress');
  if (!progressEl) return;
  if (isDaily(progress)) {
    progressEl.textContent = `第 ${progress.dailyCompleted}/${DAILY_GOAL} 題`;
  } else {
    progressEl.textContent = '自由練習';
  }
}
```

**Step 5: 新增 showDailyComplete 函式**

在 `updateProgress` 函式後面加：

```js
function showDailyComplete() {
  const summary = getDailySummary(progress);
  const overlay = document.createElement('div');
  overlay.className = 'celebration';

  const content = document.createElement('div');
  content.className = 'daily-complete';
  content.innerHTML = `
    <div class="daily-complete__title">今日練習完成！</div>
    <div class="daily-complete__stars">⭐ × ${summary.totalStars}</div>
    <div class="daily-complete__sub">繼續進入自由練習</div>
  `;

  overlay.appendChild(content);
  document.body.appendChild(overlay);

  setTimeout(() => {
    overlay.remove();
    startNewProblem();
  }, 3000);
}
```

**Step 6: 在 startNewProblem 中呼叫 updateProgress**

在 `startNewProblem` 函式的 `updateHint()` 呼叫後面（第 27 行後）加一行：

```js
  updateProgress();
```

**Step 7: Commit**

```bash
git add js/app.js
git commit -m "feat: integrate daily practice mode into app flow"
```

---

### Task 3: 新增 HTML 進度元素

**Files:**
- Modify: `index.html`

**Step 1: 在 header 的 stats 區塊加進度文字**

在 `index.html` 第 17 行（`<span id="streak"...>` 前面）插入：

```html
        <span id="progress" class="progress">第 0/5 題</span>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add daily progress indicator to header"
```

---

### Task 4: 新增 CSS 樣式

**Files:**
- Modify: `css/style.css`

**Step 1: 在 `.stats` 區塊後面（第 63 行後）加進度和每日完成樣式**

```css
.progress {
  color: #c8e6c9;
  font-size: clamp(0.85rem, 3vw, 1.1rem);
  font-weight: 700;
}

/* === Daily complete overlay === */
.daily-complete {
  text-align: center;
  animation: celebrate-pop 0.6s ease-out;
}

.daily-complete__title {
  font-size: clamp(2rem, 8vw, 3.5rem);
  font-weight: 900;
  color: #ffd34d;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  margin-bottom: 16px;
}

.daily-complete__stars {
  font-size: clamp(1.5rem, 6vw, 2.5rem);
  color: #fff;
  font-weight: 700;
}

.daily-complete__sub {
  font-size: clamp(0.9rem, 3vw, 1.2rem);
  color: #c8e6c9;
  margin-top: 12px;
}
```

**Step 2: 在 `@media (max-width: 480px)` 區塊內加：**

```css
  .progress {
    font-size: 0.8rem;
  }
```

**Step 3: Commit**

```bash
git add css/style.css
git commit -m "style: add daily progress and completion overlay styles"
```

---

### Task 5: 驗證

**Step 1: 執行測試**

```bash
npm test
```

Expected: 所有測試 passing（原 23 + daily tests）

**Step 2: 手動測試（可跳過，交給 reviewer）**

```bash
npx serve .
```

驗證項目：
- 開啟頁面 → header 顯示「第 0/5 題」
- 完成 1 題 → 變成「第 1/5 題」
- 完成第 5 題 → 顯示「今日練習完成！⭐ × N」大畫面，3 秒後消失
- 消失後 → header 顯示「自由練習」，繼續出題
- 重新整理頁面 → 進度從 localStorage 恢復（不會歸零）
- Chrome DevTools → Application → Local Storage → 可看到 `aiden-math-progress` key

**Step 3: Merge 回 main**

```bash
git checkout main
git merge feat/daily-practice --no-edit
git push
```

---

## 完整修改清單

| 檔案 | 動作 | 行數變化 |
|------|------|----------|
| `js/daily.js` | 新增 | ~40 行 |
| `tests/daily.test.js` | 新增 | ~75 行 |
| `js/app.js` | 修改 | +40 行（import + progress 邏輯 + 2 個新函式 + 修改 onProblemComplete） |
| `index.html` | 修改 | +1 行 |
| `css/style.css` | 修改 | +30 行 |
