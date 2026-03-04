import { generateProblem, calculateSteps, generateLayout, validateInput } from './division.js';

const grid = document.getElementById('division-grid');
const hintEl = document.getElementById('hint');
const numpadBtns = document.querySelectorAll('.num-btn');

let state = null;

function startNewProblem() {
  const { dividend, divisor } = generateProblem();
  const steps = calculateSteps(dividend, divisor);
  const layout = generateLayout(steps, dividend, divisor);

  const fillable = layout.cells
    .filter(c => c.fillable)
    .sort((a, b) => a.order - b.order);

  state = { dividend, divisor, steps, layout, fillable, currentIndex: 0 };

  renderGrid();
  activateCurrent();
  updateHint();
}

// Layout row → CSS grid row (inserting line rows for division-line and sep-lines)
// Layout row 0 → grid 1 (quotient)
//                 grid 2 (division line)
// Layout row 1 → grid 3 (dividend)
// Layout row 2 → grid 4 (product round 0)
//                 grid 5 (sep line)
// Layout row 3 → grid 6 (subtract round 0)
// ...pattern repeats: +3 per round
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

  // Render cells
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

  // Division line (between quotient row and dividend row)
  const divLine = document.createElement('div');
  divLine.className = 'division-line';
  divLine.style.gridRow = '2';
  grid.appendChild(divLine);

  // Separator lines (between product and subtract for each round)
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

function handleDigit(digit) {
  if (!state || state.currentIndex >= state.fillable.length) return;

  const cell = state.fillable[state.currentIndex];
  const el = getCellEl(cell.order);
  if (!el) return;

  if (validateInput(cell, digit)) {
    // Correct: fill and advance
    el.classList.remove('cell--fillable', 'cell--active');
    el.classList.add('cell--filled');
    el.textContent = cell.value;

    state.currentIndex++;
    activateCurrent();
    updateHint();

    // All done → auto next problem
    if (state.currentIndex >= state.fillable.length) {
      setTimeout(startNewProblem, 1500);
    }
  } else {
    // Wrong: shake
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
