/**
 * 數織核心邏輯 — 純函式，無 DOM 依賴。
 *
 * 單向管線：單字 → 解答點陣 → 提示；外加答案比對。
 * 不含數織求解器／唯一解驗證（過關靠打字答案，見 PRD「Out of Scope」）。
 */

import { FONT } from './font.js';

// 每個字母固定 5 列 × 3 欄；字母之間不留空白欄。
export const LETTER_ROWS = 5;
export const LETTER_COLS = 3;

/**
 * 把單字攤平成 5 × (3·長度) 的布林點陣。
 * @param {string} word 單字（大小寫不敏感）
 * @returns {{ word: string, rows: number, cols: number,
 *            cells: boolean[][], letterRanges: {char: string, start: number, width: number}[] }}
 */
export function buildSolution(word) {
  const chars = [...String(word).toUpperCase()];
  if (chars.length === 0) throw new Error('buildSolution: 空字串無法生成謎題');

  const letterRanges = chars.map((char, i) => {
    if (!FONT[char]) throw new Error(`buildSolution: 缺少字模 "${char}"`);
    return { char, start: i * LETTER_COLS, width: LETTER_COLS };
  });

  const cols = chars.length * LETTER_COLS;
  const cells = [];
  for (let r = 0; r < LETTER_ROWS; r++) {
    const row = [];
    for (const char of chars) {
      const glyphRow = FONT[char][r];
      for (let c = 0; c < LETTER_COLS; c++) {
        row.push(glyphRow[c] === '1');
      }
    }
    cells.push(row);
  }

  return { word: chars.join(''), rows: LETTER_ROWS, cols, cells, letterRanges };
}

// 一條（行或列）布林序列 → 連續塗色段長度；全空回 [0]。
function lineRuns(line) {
  const runs = [];
  let count = 0;
  for (const filled of line) {
    if (filled) {
      count++;
    } else if (count > 0) {
      runs.push(count);
      count = 0;
    }
  }
  if (count > 0) runs.push(count);
  return runs.length > 0 ? runs : [0];
}

/**
 * 算出每行、每列的連續塗色段長度陣列。
 * @param {boolean[][]} cells 解答點陣（buildSolution(...).cells）
 * @returns {{ rows: number[][], cols: number[][] }}
 */
export function computeClues(cells) {
  const rows = cells.map(lineRuns);
  const numCols = cells.length > 0 ? cells[0].length : 0;
  const cols = [];
  for (let c = 0; c < numCols; c++) {
    cols.push(lineRuns(cells.map((row) => row[c])));
  }
  return { rows, cols };
}

/**
 * 大小寫不敏感、忽略前後空白地比對單字。
 * @param {string} typed 玩家輸入
 * @param {string} word 正解單字
 * @returns {boolean}
 */
export function checkAnswer(typed, word) {
  return String(typed).trim().toUpperCase() === String(word).trim().toUpperCase();
}
