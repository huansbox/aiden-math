import { generateProblem, calculateSteps, generateLayout, validateInput } from './division.js';

const grid = document.getElementById('division-grid');
const hintEl = document.getElementById('hint');
const numpadBtns = document.querySelectorAll('.num-btn');
const streakEl = document.getElementById('streak');
const streakCountEl = streakEl.querySelector('.streak-count');
const starsEl = document.getElementById('stars');

let state = null;
let streak = 0;

function startNewProblem() {
  const { dividend, divisor } = generateProblem();
  const steps = calculateSteps(dividend, divisor);
  const layout = generateLayout(steps, dividend, divisor);

  const fillable = layout.cells
    .filter(c => c.fillable)
    .sort((a, b) => a.order - b.order);

  state = { dividend, divisor, steps, layout, fillable, currentIndex: 0, errors: 0 };

  renderGrid();
  activateCurrent();
  updateHint();
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

  grid.style.gridTemplateColumns = 'repeat(4, clamp(40px, 10vw, 56px))';
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
  if (errors <= 2) return 3;
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

function onProblemComplete() {
  const stars = getStars(state.errors);
  streak++;

  updateStreak();
  showStars(stars);
  showCelebration();

  setTimeout(startNewProblem, 1500);
}

function handleDigit(digit) {
  if (!state || state.currentIndex >= state.fillable.length) return;

  const cell = state.fillable[state.currentIndex];
  const el = getCellEl(cell.order);
  if (!el) return;

  if (validateInput(cell, digit)) {
    el.classList.remove('cell--fillable', 'cell--active');
    el.classList.add('cell--filled');
    el.textContent = cell.value;

    state.currentIndex++;
    activateCurrent();
    updateHint();

    if (state.currentIndex >= state.fillable.length) {
      onProblemComplete();
    }
  } else {
    state.errors++;
    if (state.errors >= 3) streak = 0; // reset streak on too many errors
    updateStreak();

    el.classList.add('cell--error');
    el.addEventListener('animationend', () => el.classList.remove('cell--error'), { once: true });
  }
}

// Number pad clicks
numpadBtns.forEach(btn => {
  btn.addEventListener('click', () => handleDigit(Number(btn.dataset.digit)));
});

// Keyboard input
document.addEventListener('keydown', (e) => {
  if (e.key >= '0' && e.key <= '9') handleDigit(Number(e.key));
});

startNewProblem();
