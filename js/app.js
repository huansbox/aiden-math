import { generateProblem, calculateSteps, generateLayout, validateInput } from './division.js';
import { resumeAudio, playCorrect, playError, playComplete } from './sound.js';
import { loadProgress, saveResult, isDaily, getDailySummary, DAILY_GOAL } from './daily.js';
import { launchFireworks } from './fireworks.js';

const grid = document.getElementById('division-grid');
const hintEl = document.getElementById('hint');
const numpadBtns = document.querySelectorAll('.num-btn');
const streakEl = document.getElementById('streak');
const streakCountEl = streakEl.querySelector('.streak-count');
const starsEl = document.getElementById('stars');

let state = null;
let streak = 0;
let progress = loadProgress(localStorage, new Date().toISOString().slice(0, 10));

function startNewProblem() {
  const { dividend, divisor } = generateProblem();
  const steps = calculateSteps(dividend, divisor);
  const layout = generateLayout(steps, dividend, divisor);

  const fillable = layout.cells
    .filter(c => c.fillable)
    .sort((a, b) => a.order - b.order);

  state = { dividend, divisor, steps, layout, fillable, currentIndex: 0, errors: 0, cellErrors: 0 };

  starsEl.hidden = true;
  renderGrid();
  activateCurrent();
  updateHint();
  updateProgress();
}

// Layout row → CSS grid row (inserting line rows for division-line and sep-lines)
function toGridRow(layoutRow) {
  if (layoutRow === 0) return 1;
  if (layoutRow === 1) return 3;
  const offset = layoutRow - 2;
  const round = Math.floor(offset / 2);
  const isSubtract = offset % 2 === 1;
  return isSubtract ? 6 + round * 3 : 4 + round * 3;
}

function renderGrid() {
  const { layout, steps } = state;
  const numRounds = steps.rounds.length;
  const totalGridRows = 3 + numRounds * 3;

  grid.style.gridTemplateColumns = 'repeat(4, var(--cell-size))';
  grid.style.gridTemplateRows = `repeat(${totalGridRows}, auto)`;
  grid.innerHTML = '';

  for (const cell of layout.cells) {
    const el = document.createElement('div');
    el.className = 'cell';
    el.style.gridRow = String(toGridRow(cell.row));
    el.style.gridColumn = String(cell.col + 1);

    if (cell.fillable) {
      el.classList.add('cell--fillable');
      el.dataset.order = cell.order;
    } else {
      el.classList.add('cell--static');
      el.textContent = cell.value;
      if (cell.type === 'divisor') el.classList.add('cell--divisor');
    }

    grid.appendChild(el);
  }

  const divLine = document.createElement('div');
  divLine.className = 'division-line';
  divLine.style.gridRow = '2';
  grid.appendChild(divLine);

  for (let r = 0; r < numRounds; r++) {
    const productCells = layout.cells.filter(c => c.type === 'product' && c.roundIndex === r);
    if (productCells.length === 0) continue;

    const minCol = Math.min(...productCells.map(c => c.col));
    const maxCol = Math.max(...productCells.map(c => c.col));

    const sep = document.createElement('div');
    sep.className = 'sep-line';
    sep.style.gridRow = String(5 + r * 3);
    sep.style.gridColumn = `${minCol + 1} / ${maxCol + 2}`;
    grid.appendChild(sep);
  }
}

function getCellEl(order) {
  return grid.querySelector(`[data-order="${order}"]`);
}

function activateCurrent() {
  grid.querySelectorAll('.cell--active').forEach(el => el.classList.remove('cell--active'));
  if (state.currentIndex >= state.fillable.length) return;
  getCellEl(state.fillable[state.currentIndex].order)?.classList.add('cell--active');
}

function updateHint() {
  if (state.currentIndex >= state.fillable.length) {
    const { steps } = state;
    hintEl.textContent = steps.remainder > 0
      ? `答案：${steps.quotient} 餘 ${steps.remainder} ✓`
      : `答對了！答案是 ${steps.quotient}`;
    return;
  }

  const cell = state.fillable[state.currentIndex];
  const { divisor, steps } = state;
  const roundIdx = cell.type === 'quotient' ? cell.col - 1 : cell.roundIndex;
  const round = steps.rounds[roundIdx];

  // Show hint only after 2 wrong attempts on current cell
  if (state.cellErrors < 2) {
    hintEl.textContent = '填入正確的數字';
    return;
  }

  const hintMap = {
    quotient:  `${round.currentNumber} ÷ ${divisor} = ?`,
    product:   `${divisor} × ${round.quotientDigit} = ?`,
    subtract:  `${round.currentNumber} − ${round.product} = ?`,
    bringdown: `把 ${cell.value} 帶下來`,
  };

  hintEl.textContent = hintMap[cell.type] || '';
}

// Star rating: 0 errors = 3★, 1-2 = 2★, 3+ = 1★
function getStars(errors) {
  if (errors === 0) return 3;
  if (errors <= 2) return 2;
  return 1;
}

function updateStreak() {
  streakEl.hidden = streak === 0;
  streakCountEl.textContent = streak;
}

function showStars(count) {
  starsEl.hidden = false;
  starsEl.textContent = '★'.repeat(count) + '☆'.repeat(3 - count);
}

function showCelebration() {
  const overlay = document.createElement('div');
  overlay.className = 'celebration';

  const text = document.createElement('div');
  text.className = 'celebration-text';
  text.textContent = streak >= 3 ? '太厲害了！' : '做得好！';

  overlay.appendChild(text);
  document.body.appendChild(overlay);

  setTimeout(() => overlay.remove(), 1200);
}

function updateProgress() {
  const progressEl = document.getElementById('progress');
  if (!progressEl) return;
  if (isDaily(progress)) {
    progressEl.textContent = `第 ${progress.dailyCompleted}/${DAILY_GOAL} 題`;
  } else {
    progressEl.textContent = '自由練習';
  }
}

function showDailyComplete() {
  const summary = getDailySummary(progress);

  const overlay = document.createElement('div');
  overlay.className = 'fireworks-overlay';

  const canvas = document.createElement('canvas');
  canvas.className = 'fireworks-canvas';
  overlay.appendChild(canvas);

  const content = document.createElement('div');
  content.className = 'fireworks-content';
  content.innerHTML = `
    <img class="fireworks-img" src="assets/great-job.png" alt="你好棒" onerror="this.style.display='none'">
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

function onProblemComplete() {
  playComplete();
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

function handleDigit(digit) {
  if (!state || state.currentIndex >= state.fillable.length) return;

  const cell = state.fillable[state.currentIndex];
  const el = getCellEl(cell.order);
  if (!el) return;

  if (validateInput(cell, digit)) {
    playCorrect();
    el.classList.remove('cell--fillable', 'cell--active');
    el.classList.add('cell--filled');
    el.textContent = cell.value;

    state.currentIndex++;
    state.cellErrors = 0;
    activateCurrent();
    updateHint();

    if (state.currentIndex >= state.fillable.length) {
      onProblemComplete();
    }
  } else {
    playError();
    state.errors++;
    state.cellErrors++;
    if (state.errors >= 3) streak = 0;
    updateStreak();
    updateHint();

    el.classList.add('cell--error');
    el.addEventListener('animationend', () => el.classList.remove('cell--error'), { once: true });
  }
}

// Number pad clicks
numpadBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    resumeAudio();
    handleDigit(Number(btn.dataset.digit));
  });
});

// Keyboard input
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') handleDigit(Number(e.key));
});

startNewProblem();
