# 星星顯示強化 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** (1) 在 header 永久顯示歷史累計星星總數，每題完成即更新。(2) 每題完成時更醒目地展示本題獲得的星星，停留時間拉長。

**Architecture:** 純 UI 改動。header 新增累計星星元素，從 `progress.totalStars` 讀取。每題完成的星星展示改為在 card 上方 overlay 顯示大字星星 + 動畫，停留從 1.5 秒延長到 3 秒。

**Tech Stack:** HTML / CSS / JS（既有架構）

---

## 現況分析

### 累計星星
- `daily.js` 的 `progress.totalStars` 已經在 localStorage 中跨天累計，不會重置
- 目前沒有 UI 顯示這個數值

### 每題完成流程（app.js `onProblemComplete`，第 211-228 行）
```
onProblemComplete() →
  playComplete()
  getStars() → streak++ → saveResult()
  updateStreak() → showStars() → updateProgress()
  if 第5題 → showDailyComplete()（5秒煙火）
  else → showCelebration()（1.2秒文字） → 1.5秒後 startNewProblem()
```

- `showStars()`（第 144-146 行）：設定 header 的 `#stars` 文字為 ★☆，位置在 header 右上角，字很小
- `showCelebration()`（第 149-161 行）：顯示「做得好！」大字 overlay，1.2 秒後消失
- `setTimeout(startNewProblem, 1500)`：1.5 秒後出下一題

**問題**：星星只在 header 小字顯示，慶祝文字「做得好！」和星星是分開的，星星不醒目、停留太短。

---

### Task 1: HTML 新增累計星星元素

**Files:**
- Modify: `index.html`

**Step 1: 在 header 的 stats 區塊最前面加累計星星**

在 `index.html` 第 17 行（`<span id="progress"...>` 前面）插入：

```html
        <span id="total-stars" class="total-stars">⭐ 0</span>
```

修改後 stats 區塊完整內容為：
```html
      <div class="stats">
        <span id="total-stars" class="total-stars">⭐ 0</span>
        <span id="progress" class="progress">第 0/5 題</span>
        <span id="streak" class="streak" hidden>🔥 <span class="streak-count">0</span></span>
        <span id="stars" class="stars" hidden></span>
      </div>
```

**Step 2: Commit**

```bash
git add index.html
git commit -m "feat: add total stars display element to header"
```

---

### Task 2: JS 更新累計星星 + 調整完成流程

**Files:**
- Modify: `js/app.js`

**Step 1: 在頂部 DOM 引用區（第 11 行 `starsEl` 後面）加：**

```js
const totalStarsEl = document.getElementById('total-stars');
```

**Step 2: 新增 updateTotalStars 函式**

在 `updateProgress` 函式後面（第 171 行後）加：

```js
function updateTotalStars() {
  totalStarsEl.textContent = `⭐ ${progress.totalStars}`;
}
```

**Step 3: 在 startNewProblem 中呼叫 updateTotalStars**

在 `startNewProblem` 函式的 `updateProgress()` 後面（第 32 行後）加一行：

```js
  updateTotalStars();
```

**Step 4: 替換 showCelebration 函式，合併星星展示**

將現有 `showCelebration` 函式（第 149-161 行）替換為：

```js
function showCelebration(stars) {
  const overlay = document.createElement('div');
  overlay.className = 'celebration';

  const content = document.createElement('div');
  content.className = 'celebration-content';

  const starsText = document.createElement('div');
  starsText.className = 'celebration-stars';
  starsText.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

  const msg = document.createElement('div');
  msg.className = 'celebration-text';
  msg.textContent = streak >= 3 ? '太厲害了！' : '做得好！';

  content.appendChild(starsText);
  content.appendChild(msg);
  overlay.appendChild(content);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 2500);
}
```

**Step 5: 修改 onProblemComplete，傳入 stars 並延長等待時間**

將 `onProblemComplete` 函式（第 211-228 行）替換為：

```js
function onProblemComplete() {
  playComplete();
  const stars = getStars(state.errors);
  streak++;

  progress = saveResult(localStorage, progress, { stars, errors: state.errors });

  updateStreak();
  updateTotalStars();
  updateProgress();

  if (progress.dailyCompleted === DAILY_GOAL) {
    showDailyComplete();
  } else {
    showCelebration(stars);
    setTimeout(startNewProblem, 3000);
  }
}
```

注意變更：
- 移除 `showStars(count)` 呼叫（星星已整合進 `showCelebration`）
- 新增 `updateTotalStars()` 呼叫
- `showCelebration(stars)` 現在接收 stars 參數
- `setTimeout` 從 1500 延長到 3000（3 秒）

**Step 6: `showStars` 函式可以保留但不再被 onProblemComplete 呼叫**

`showStars` 函式保留不刪（`showDailyComplete` 可能間接用到 `#stars` 元素），但 header 的 `#stars` 元素不再是主要展示方式。在 `startNewProblem` 中已有 `starsEl.hidden = true` 重置。

**Step 7: Commit**

```bash
git add js/app.js
git commit -m "feat: show total stars in header and enhance per-problem star celebration"
```

---

### Task 3: CSS 樣式

**Files:**
- Modify: `css/style.css`

**Step 1: 在 `.progress` 樣式後面加累計星星樣式：**

```css
.total-stars {
  color: #ffd34d;
  font-size: clamp(0.9rem, 3.2vw, 1.2rem);
  font-weight: 900;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.3);
}
```

**Step 2: 修改 `.celebration` 相關樣式，加入星星展示**

在現有 `.celebration-text` 樣式後面加：

```css
.celebration-content {
  text-align: center;
  animation: celebrate-pop 0.6s ease-out;
}

.celebration-stars {
  font-size: clamp(3rem, 12vw, 5rem);
  color: #ffd34d;
  text-shadow: 0 4px 20px rgba(255, 211, 77, 0.6);
  letter-spacing: 0.1em;
  margin-bottom: 8px;
  animation: star-pulse 0.8s ease-in-out;
}

@keyframes star-pulse {
  0% { transform: scale(0); opacity: 0; }
  50% { transform: scale(1.3); }
  70% { transform: scale(0.95); }
  100% { transform: scale(1); opacity: 1; }
}
```

**Step 3: 把現有 `.celebration-text` 從獨立動畫改為由 `.celebration-content` 統一控制**

將現有的 `.celebration-text` 樣式修改為（移除動畫，因為父層 `.celebration-content` 已有）：

```css
.celebration-text {
  font-size: clamp(1.5rem, 6vw, 2.5rem);
  font-weight: 900;
  color: #ffd34d;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}
```

**Step 4: 在 `@media (max-width: 480px)` 區塊加：**

```css
  .total-stars {
    font-size: 0.85rem;
  }
```

**Step 5: Commit**

```bash
git add css/style.css
git commit -m "style: add total stars badge and enhanced celebration star animation"
```

---

### Task 4: 驗證

**Step 1: 執行測試**

```bash
npm test
```

Expected: 30 tests passing

**Step 2: 手動測試（可跳過，交給 reviewer）**

```bash
npx serve .
```

驗證項目：
- 開啟頁面 → header 左側顯示「⭐ N」（N 為歷史累計）
- 完成一題 → 大字星星 ★★★ / ★★☆ / ★☆☆ + 「做得好！」overlay
- overlay 停留約 2.5 秒後消失
- 消失後 header 的 ⭐ 數字已更新（+1~3）
- 星星數字永不歸零，重新整理仍保持
- 完成第 5 題 → 煙火畫面不受影響
- iPad 橫式 / iPhone 壓縮版佈局不受影響

**Step 3: Merge 回 main**

```bash
git checkout main
git merge feat/star-display --no-edit
git push
```

---

## 完整修改清單

| 檔案 | 動作 | 行數變化 |
|------|------|----------|
| `index.html` | 修改 | +1 行 |
| `js/app.js` | 修改 | ~+15 行（新增 updateTotalStars、替換 showCelebration、修改 onProblemComplete） |
| `css/style.css` | 修改 | ~25 行（total-stars、celebration-content、celebration-stars、star-pulse） |
