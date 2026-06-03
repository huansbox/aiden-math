/**
 * 數織解謎 — UI 渲染 + 互動（#5 題庫 + 首頁 + 過關紀錄）。
 *
 * 純函式邏輯在 ../nonogram.js（攤平／提示／比對）與 ../library.js
 * （題庫解析／過關紀錄／下一題），本檔只負責 DOM 與 localStorage。
 *
 * 流程：載入 wordlist → 首頁編號題庫（不顯示單字、標★）→ 點題進遊戲
 * → 檢查打字答案 → 過關記到 localStorage → 「下一題」走題庫順序。
 * 拖曳連續塗（#3）、看答案／填錯標示（#3）、鍵盤抽屜（#4）留待後續切片。
 */

import { buildSolution, computeClues, checkAnswer, letterDividerCols } from '../nonogram.js';
import {
  parseWordlist,
  isSolved,
  markSolved,
  nextIndex,
  loadProgress,
  saveProgress,
} from '../library.js';

const els = {
  home: document.getElementById('home'),
  game: document.getElementById('game'),
  library: document.getElementById('library'),
  puzzleLabel: document.getElementById('puzzle-label'),
  homeBtn: document.getElementById('home-btn'),
  colClues: document.getElementById('col-clues'),
  rowClues: document.getElementById('row-clues'),
  grid: document.getElementById('grid'),
  answer: document.getElementById('answer'),
  keyboard: document.getElementById('keyboard'),
  checkBtn: document.getElementById('check-btn'),
  nextBtn: document.getElementById('next-btn'),
  hint: document.getElementById('hint'),
};

// ---- 狀態 ----
let words = [];        // 題庫單字（已過濾為可玩）
let solvedKeys = loadProgress(localStorage);
let currentIndex = -1; // 目前題目索引（-1 = 在首頁）
let currentWord = '';
let solution = null;
let clues = null;
let dividerCols = new Set();
let typed = '';
let solved = false;    // 本題是否已過關（過關後鎖定塗色/打字，避免畫面與「過關」訊息矛盾）

// ---- 首頁：編號題庫 ----
function showHome() {
  currentIndex = -1;
  renderLibrary();
  els.game.hidden = true;
  els.home.hidden = false;
}

// 在題庫區放一行訊息（載入中／載入失敗）。
function showLibraryMessage(text) {
  els.library.innerHTML = '';
  const msg = document.createElement('p');
  msg.className = 'library-msg';
  msg.textContent = text;
  els.library.appendChild(msg);
}

function renderLibrary() {
  if (words.length === 0) {
    showLibraryMessage('題庫載入失敗 😢 請重新整理頁面再試一次');
    return;
  }
  els.library.innerHTML = '';
  words.forEach((word, index) => {
    const done = isSolved(solvedKeys, word);
    const card = document.createElement('button');
    card.className = 'puzzle-card';
    card.dataset.index = index;
    if (done) card.classList.add('is-solved');

    const num = document.createElement('span');
    num.className = 'puzzle-card__num';
    num.textContent = `第 ${index + 1} 題`;
    card.appendChild(num);

    const star = document.createElement('span');
    star.className = 'puzzle-card__star';
    star.textContent = done ? '★' : '☆';
    card.appendChild(star);

    els.library.appendChild(card);
  });
}

els.library.addEventListener('click', (e) => {
  const card = e.target.closest('.puzzle-card');
  if (!card) return;
  loadPuzzle(Number(card.dataset.index));
});

// ---- 載入並開始一題 ----
function loadPuzzle(index) {
  if (index < 0 || index >= words.length) return;
  currentIndex = index;
  currentWord = words[index];
  solution = buildSolution(currentWord);
  clues = computeClues(solution.cells);
  dividerCols = new Set(letterDividerCols(solution.letterRanges));
  typed = '';
  solved = false;

  els.puzzleLabel.textContent = `第 ${index + 1} 題`;
  els.nextBtn.hidden = true;
  els.checkBtn.hidden = false;
  clearHint();
  renderColClues();
  renderRowClues();
  renderGrid();
  renderAnswer();

  els.home.hidden = true;
  els.game.hidden = false;
}

// ---- 格盤渲染（欄列數一律由 JS 設定，非 CSS 寫死）----
// 字母為比例字寬，邊界由 letterRanges 推算（每個非首字母的左緣），不能假設固定間隔。
function isLetterDivider(col) {
  return dividerCols.has(col);
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
  if (solved) return; // 過關後鎖定，避免改動格盤與「過關」狀態矛盾
  const cell = e.target.closest('.cell');
  if (!cell) return;
  cell.classList.toggle('filled');
});

// ---- 答案欄 + 螢幕鍵盤 ----
function renderAnswer() {
  els.answer.innerHTML = '';
  for (let i = 0; i < currentWord.length; i++) {
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
  if (solved) return; // 過關後鎖定輸入
  const btn = e.target.closest('.key');
  if (!btn) return;
  const key = btn.dataset.key;
  if (key === 'DEL') {
    typed = typed.slice(0, -1);
  } else if (typed.length < currentWord.length) {
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
  if (checkAnswer(typed, currentWord)) {
    els.hint.textContent = '🎉 答對了！過關！';
    els.hint.classList.remove('bad');
    els.hint.classList.add('ok');
    solved = true;
    solvedKeys = markSolved(solvedKeys, currentWord);
    saveProgress(localStorage, solvedKeys);
    els.checkBtn.hidden = true;
    els.nextBtn.hidden = false;
  } else {
    els.hint.textContent = '再試試 💪';
    els.hint.classList.remove('ok');
    els.hint.classList.add('bad');
  }
});

// ---- 下一題（題庫順序，最後一題折返第一題）----
els.nextBtn.addEventListener('click', () => {
  const next = nextIndex(currentIndex, words.length);
  if (next === null) {
    showHome();
  } else {
    loadPuzzle(next);
  }
});

els.homeBtn.addEventListener('click', showHome);

// ---- 初始化：載入題庫 → 首頁 ----
async function init() {
  renderKeyboard();
  // 先顯示首頁並標示載入中，避免 fetch 期間整頁空白。
  els.game.hidden = true;
  els.home.hidden = false;
  showLibraryMessage('載入中⋯');
  try {
    const res = await fetch('wordlist.txt', { cache: 'no-store' });
    if (!res.ok) throw new Error(`wordlist 載入失敗：HTTP ${res.status}`);
    words = parseWordlist(await res.text());
  } catch {
    words = [];
  }
  showHome();
}

init();
