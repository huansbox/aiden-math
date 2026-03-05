# 每日完成煙火慶祝特效 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 每日 5 題完成時，顯示 Canvas 煙火特效 + 「你好棒」圖片，取代目前的純文字總結畫面。

**Architecture:** 新增 `js/fireworks.js` 模組，用 Canvas 2D API 繪製煙火粒子。`app.js` 的 `showDailyComplete()` 改為呼叫煙火 + 圖片 overlay。圖片使用 `<img>` 標籤，來源為 `assets/great-job.png`。

**Tech Stack:** Canvas 2D API（瀏覽器原生）

---

## 背景知識

### 煙火粒子系統
- 每一發煙火由一個「發射體」（rocket）上升，到達高點後「爆開」為 40-60 個粒子
- 每個粒子有：位置(x,y)、速度(vx,vy)、顏色、生命值(life)、重力
- 每幀更新所有粒子位置、套用重力、降低 life，life=0 就移除
- 用 `requestAnimationFrame` 驅動動畫循環
- 施放 3 發煙火，間隔 400ms

### 整合方式
- `showDailyComplete()` 目前建立一個 `.celebration` overlay 顯示文字
- 改為：建立全螢幕 `<canvas>` + 圖片 + 星星文字的 overlay
- 煙火在 canvas 上繪製，圖片和文字用 HTML absolute 定位在 canvas 上方
- 5 秒後整個 overlay 移除，進入自由練習

---

### Task 1: 建立 fireworks.js 模組

**Files:**
- Create: `js/fireworks.js`

**Step 1: 建立 fireworks.js**

```js
// js/fireworks.js

export function launchFireworks(canvas, duration = 4000) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.offsetWidth;
  const H = canvas.height = canvas.offsetHeight;

  const particles = [];
  const colors = ['#ffd34d', '#ff6b6b', '#51cf66', '#339af0', '#cc5de8', '#ff922b'];
  let animId = null;
  const startTime = performance.now();

  function random(min, max) {
    return Math.random() * (max - min) + min;
  }

  function explode(x, y) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const count = Math.floor(random(40, 60));
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + random(-0.1, 0.1);
      const speed = random(2, 6);
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        decay: random(0.01, 0.025),
        color,
        size: random(2, 4),
      });
    }
  }

  // Schedule 3 fireworks
  const launches = [0, 400, 800];
  launches.forEach((delay) => {
    setTimeout(() => {
      explode(random(W * 0.2, W * 0.8), random(H * 0.15, H * 0.4));
    }, delay);
  });

  function update() {
    ctx.clearRect(0, 0, W, H);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06; // gravity
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;

    if (performance.now() - startTime < duration || particles.length > 0) {
      animId = requestAnimationFrame(update);
    }
  }

  animId = requestAnimationFrame(update);

  // Return cleanup function
  return () => {
    if (animId) cancelAnimationFrame(animId);
  };
}
```

**Step 2: Commit**

```bash
git add js/fireworks.js
git commit -m "feat: add fireworks.js with Canvas 2D particle system"
```

---

### Task 2: 準備圖片資源目錄

**Files:**
- Create: `assets/` 目錄

**Step 1: 建立 assets 目錄，放一個 placeholder（圖片由使用者另外提供）**

```bash
mkdir -p assets
```

圖片已準備好：`assets/great-job-01.webp` 到 `great-job-10.webp`（10 張，WebP 格式，合計 2.3MB）。

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: create assets directory for celebration image"
```

---

### Task 3: 修改 showDailyComplete 使用煙火 + 圖片

**Files:**
- Modify: `js/app.js`

**Step 1: 在 app.js 頂部加 import**

在第 3 行（`import ... from './daily.js'`）後面加：

```js
import { launchFireworks } from './fireworks.js';
```

**Step 2: 替換 showDailyComplete 函式**

將 `js/app.js` 中的 `showDailyComplete` 函式（目前約第 172-192 行）整個替換為：

```js
const CELEBRATION_IMAGES = Array.from({ length: 10 }, (_, i) =>
  `assets/great-job-${String(i + 1).padStart(2, '0')}.webp`
);

function randomCelebrationImage() {
  return CELEBRATION_IMAGES[Math.floor(Math.random() * CELEBRATION_IMAGES.length)];
}

function showDailyComplete() {
  const summary = getDailySummary(progress);

  const overlay = document.createElement('div');
  overlay.className = 'fireworks-overlay';

  // Canvas for fireworks
  const canvas = document.createElement('canvas');
  canvas.className = 'fireworks-canvas';
  overlay.appendChild(canvas);

  // Content layer (above canvas)
  const content = document.createElement('div');
  content.className = 'fireworks-content';
  content.innerHTML = `
    <img class="fireworks-img" src="${randomCelebrationImage()}" alt="你好棒" onerror="this.style.display='none'">
    <div class="fireworks-title">今日練習完成！</div>
    <div class="fireworks-stars">⭐ × ${summary.totalStars}</div>
  `;
  overlay.appendChild(content);

  document.body.appendChild(overlay);

  const cleanup = launchFireworks(canvas, 4000);

  setTimeout(() => {
    cleanup();
    overlay.remove();
    startNewProblem();
  }, 5000);
}
```

**Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: integrate fireworks + image into daily completion celebration"
```

---

### Task 4: 新增 CSS 樣式

**Files:**
- Modify: `css/style.css`

**Step 1: 在 `.daily-complete__sub` 樣式後面（約第 96 行後），將現有的 `.daily-complete` 相關樣式保留，另外新增煙火 overlay 樣式：**

```css
/* === Fireworks overlay === */
.fireworks-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fireworks-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.fireworks-content {
  position: relative;
  z-index: 1;
  text-align: center;
  animation: celebrate-pop 0.6s ease-out;
}

.fireworks-img {
  width: clamp(120px, 30vw, 200px);
  height: auto;
  margin-bottom: 16px;
  filter: drop-shadow(0 4px 16px rgba(255, 211, 77, 0.5));
  animation: float-bounce 2s ease-in-out infinite;
}

.fireworks-title {
  font-size: clamp(2rem, 8vw, 3.5rem);
  font-weight: 900;
  color: #ffd34d;
  text-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
  margin-bottom: 12px;
}

.fireworks-stars {
  font-size: clamp(1.3rem, 5vw, 2rem);
  color: #fff;
  font-weight: 700;
}

@keyframes float-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
```

**Step 2: Commit**

```bash
git add css/style.css
git commit -m "style: add fireworks overlay and celebration image styles"
```

---

### Task 5: 驗證

**Step 1: 執行測試**

```bash
npm test
```

Expected: 30 tests passing（fireworks.js 是純 browser API，不影響 node 測試）

**Step 2: 手動測試（可跳過，交給 reviewer）**

```bash
npx serve .
```

驗證項目：
- 完成第 5 題 → 黑色半透明背景 + 煙火粒子噴射 + 圖片（若已提供）+ 文字
- 煙火有 3 發，不同顏色，帶重力落下
- 5 秒後 overlay 消失，進入自由練習
- 沒有圖片時（`onerror`），只顯示煙火 + 文字，不報錯
- iPad / iPhone 上 Canvas 效能正常

**Step 3: Merge 回 main**

```bash
git checkout main
git merge feat/fireworks-celebration --no-edit
git push
```

---

## 完整修改清單

| 檔案 | 動作 | 行數變化 |
|------|------|----------|
| `js/fireworks.js` | 新增 | ~75 行 |
| `js/app.js` | 修改 | ~+15 行（import + 隨機圖片 + 替換 showDailyComplete） |
| `css/style.css` | 修改 | ~50 行 |
| `assets/great-job-*.webp` | 已存在 | 10 張圖片，合計 2.3MB |
