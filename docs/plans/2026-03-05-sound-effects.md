# 音效回饋 Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 答對、答錯、完成題目時播放短促音效，強化正向回饋。

**Architecture:** 用 Web Audio API 在 runtime 合成音效（OscillatorNode），不需要外部音檔。建立 `js/sound.js` 模組匯出三個函式，在 `app.js` 的對應事件點呼叫。iPad Safari 需要在第一次 user interaction 時 resume AudioContext。

**Tech Stack:** Web Audio API（瀏覽器原生）

---

## 背景知識

### Web Audio API 重點
- `AudioContext` 是音效引擎，一個頁面只需要一個 instance
- iPad Safari 要求 AudioContext 必須在使用者觸控事件中 `resume()`，否則會被暫停（autoplay policy）
- `OscillatorNode` 可產生 sine/square/triangle 波形，搭配 `GainNode` 控制音量和淡出
- 音效產生後是一次性的（start → stop），不需要手動清理

### 音效設計
| 事件 | 波形 | 頻率 | 持續 | 效果 |
|------|------|------|------|------|
| 答對 | sine | 880Hz (A5) | 100ms | 短促高音「叮」 |
| 答錯 | square | 220Hz (A3) | 150ms | 低沉短音「咚」 |
| 完成題目 | sine | 523→659→784 Hz (C5→E5→G5) | 3 音依序，各 120ms | 上行琶音「叮叮叮」 |

---

### Task 1: 建立 sound.js 模組

**Files:**
- Create: `js/sound.js`

**Step 1: 建立 sound.js，實作 AudioContext 初始化 + 三個音效函式**

```js
// js/sound.js

let ctx = null;

function getContext() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  return ctx;
}

export function resumeAudio() {
  const c = getContext();
  if (c.state === 'suspended') c.resume();
}

function playTone(freq, type, duration, delay = 0) {
  const c = getContext();
  const osc = c.createOscillator();
  const gain = c.createGain();

  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = 0.15;
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + delay + duration);

  osc.connect(gain);
  gain.connect(c.destination);

  osc.start(c.currentTime + delay);
  osc.stop(c.currentTime + delay + duration);
}

export function playCorrect() {
  playTone(880, 'sine', 0.1);
}

export function playError() {
  playTone(220, 'square', 0.15);
}

export function playComplete() {
  playTone(523, 'sine', 0.12, 0);
  playTone(659, 'sine', 0.12, 0.13);
  playTone(784, 'sine', 0.12, 0.26);
}
```

**Step 2: Commit**

```bash
git add js/sound.js
git commit -m "feat: add sound.js with Web Audio API tone synthesis"
```

---

### Task 2: 整合音效到 app.js

**Files:**
- Modify: `js/app.js`

**Step 1: 在 app.js 頂部 import sound 模組**

在 `js/app.js` 第 1 行 import 後面加一行：

```js
import { resumeAudio, playCorrect, playError, playComplete } from './sound.js';
```

**Step 2: 在第一次觸控時 resume AudioContext**

在 `js/app.js` 的 numpad click handler（第 202-203 行）內，在 `handleDigit` 之前呼叫 `resumeAudio()`。修改為：

```js
numpadBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    resumeAudio();
    handleDigit(Number(btn.dataset.digit));
  });
});
```

**Step 3: 在 handleDigit 答對分支加 playCorrect()**

在 `js/app.js` 的 `handleDigit` 函式中，`if (validateInput(cell, digit))` 區塊的第一行加上 `playCorrect()`。即在第 177 行前插入：

```js
    playCorrect();
```

**Step 4: 在 handleDigit 答錯分支加 playError()**

在 `js/app.js` 的 else 區塊（答錯），第 190 行 `state.errors++` 前插入：

```js
    playError();
```

**Step 5: 在 onProblemComplete 加 playComplete()**

在 `js/app.js` 的 `onProblemComplete` 函式中，第 160 行 `streak++` 前插入：

```js
  playComplete();
```

**Step 6: Commit**

```bash
git add js/app.js
git commit -m "feat: integrate sound effects into interaction flow"
```

---

### Task 3: 驗證

**Step 1: 執行測試確認沒有破壞**

```bash
npm test
```

Expected: 23 tests passing（sound.js 是純 browser API，不影響 node 測試）

**Step 2: 手動測試（可跳過，交給 reviewer）**

```bash
npx serve .
```

- 打開 Chrome → 點數字按鈕 → 應聽到音效
- 答對：高音叮
- 答錯：低音咚
- 完成一題：上行琶音

**Step 3: Merge 回 main**

```bash
git checkout main
git merge feat/sound-effects --no-edit
git push
```

---

## 完整修改清單

| 檔案 | 動作 | 行數變化 |
|------|------|----------|
| `js/sound.js` | 新增 | ~35 行 |
| `js/app.js` | 修改 | +6 行（1 import + 5 呼叫點） |
