/**
 * 數織解謎 — UI 渲染 + 互動（#2 最小可玩切片）。
 *
 * 本切片用 hardcoded 題 AIDEN 證明整條管線走通：
 * font → 純函式 → 動態渲染 → 觸控塗色 → 螢幕鍵盤 → 檢查 → 過關。
 * 拖曳連續塗（#3）、鍵盤抽屜（#4）、題庫/首頁（#5）等留待後續切片。
 */

import { buildSolution, computeClues, checkAnswer, LETTER_COLS } from '../nonogram.js';

const WORD = 'AIDEN'; // 取自 nonogram/wordlist.txt

const els = {
  colClues: document.getElementById('col-clues'),
  rowClues: document.getElementById('row-clues'),
  grid: document.getElementById('grid'),
  answer: document.getElementById('answer'),
  keyboard: document.getElementById('keyboard'),
  checkBtn: document.getElementById('check-btn'),
  hint: document.getElementById('hint'),
};

const solution = buildSolution(WORD);
const clues = computeClues(solution.cells);

let typed = '';

// ---- 格盤渲染（欄列數一律由 JS 設定，非 CSS 寫死）----
// 字母邊界＝每 LETTER_COLS 欄的左緣（col 3/6/9/12…），首欄不畫。
function isLetterDivider(col) {
  return col > 0 && col % LETTER_COLS === 0;
}

function renderColClues() {
  els.colClues.innerHTML = '';
  clues.cols.forEach((clue, c) => {
    const div = document.createElement('div');
    div.className = 'col-clue';
    if (isLetterDivider(c)) div.classList.add('col-clue--divider');
    if (clue.length === 1 && clue[0] === 0) {
      div.classList.add('is-zero');
      div.textContent = '0';
    } else {
      clue.forEach((n) => {
        const span = document.createElement('span');
        span.textContent = n;
        div.appendChild(span);
      });
    }
    els.colClues.appendChild(div);
  });
}

function renderRowClues() {
  els.rowClues.innerHTML = '';
  clues.rows.forEach((clue) => {
    const div = document.createElement('div');
    div.className = 'row-clue';
    if (clue.length === 1 && clue[0] === 0) {
      div.classList.add('is-zero');
      div.textContent = '0';
    } else {
      div.textContent = clue.join(' ');
    }
    els.rowClues.appendChild(div);
  });
}

function renderGrid() {
  els.grid.style.gridTemplateColumns = `repeat(${solution.cols}, var(--cell))`;
  els.grid.style.gridTemplateRows = `repeat(${solution.rows}, var(--cell))`;
  els.grid.innerHTML = '';
  for (let r = 0; r < solution.rows; r++) {
    for (let c = 0; c < solution.cols; c++) {
      const cell = document.createElement('div');
      cell.className = 'cell';
      if (isLetterDivider(c)) cell.classList.add('cell--divider');
      cell.dataset.r = r;
      cell.dataset.c = c;
      els.grid.appendChild(cell);
    }
  }
}

// 點一下塗滿、再點一下取消（2 狀態）。拖曳連續塗留待 #3。
els.grid.addEventListener('click', (e) => {
  const cell = e.target.closest('.cell');
  if (!cell) return;
  cell.classList.toggle('filled');
});

// ---- 答案欄 + 螢幕鍵盤 ----
function renderAnswer() {
  els.answer.innerHTML = '';
  for (let i = 0; i < WORD.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    const ch = typed[i];
    if (ch) {
      slot.textContent = ch;
      slot.classList.add('filled');
    } else if (i === typed.length) {
      slot.classList.add('active'); // 下一個要填的位置
    }
    els.answer.appendChild(slot);
  }
}

function renderKeyboard() {
  els.keyboard.innerHTML = '';
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const digits = '0123456789'.split('');
  [...letters, ...digits].forEach((ch) => {
    const btn = document.createElement('button');
    btn.className = 'key';
    btn.textContent = ch;
    btn.dataset.key = ch;
    els.keyboard.appendChild(btn);
  });
  const del = document.createElement('button');
  del.className = 'key key--del';
  del.textContent = '⌫';
  del.dataset.key = 'DEL';
  els.keyboard.appendChild(del);
}

els.keyboard.addEventListener('click', (e) => {
  const btn = e.target.closest('.key');
  if (!btn) return;
  const key = btn.dataset.key;
  if (key === 'DEL') {
    typed = typed.slice(0, -1);
  } else if (typed.length < WORD.length) {
    typed += key;
  }
  clearHint();
  renderAnswer();
});

// ---- 檢查 ----
function clearHint() {
  els.hint.textContent = '';
  els.hint.classList.remove('ok', 'bad');
}

els.checkBtn.addEventListener('click', () => {
  if (checkAnswer(typed, WORD)) {
    els.hint.textContent = '🎉 答對了！過關！';
    els.hint.classList.remove('bad');
    els.hint.classList.add('ok');
  } else {
    els.hint.textContent = '再試試 💪';
    els.hint.classList.remove('ok');
    els.hint.classList.add('bad');
  }
});

// ---- 初始化 ----
renderColClues();
renderRowClues();
renderGrid();
renderAnswer();
renderKeyboard();
clearHint();
