import { describe, it, expect } from 'vitest';
import {
  buildSolution,
  computeClues,
  checkAnswer,
  letterDividerCols,
  isPlayable,
  LETTER_ROWS,
} from '../nonogram.js';
import { FONT } from '../font.js';

describe('buildSolution', () => {
  it('攤平成 5 列 × 各字模欄寬總和（比例字寬）', () => {
    // AIDEN：A I D E 各 3 欄、N 4 欄 → 3+3+3+3+4 = 16
    const sol = buildSolution('AIDEN');
    expect(sol.rows).toBe(LETTER_ROWS);
    expect(sol.cols).toBe(16);
    expect(sol.cells).toHaveLength(5);
    sol.cells.forEach((row) => expect(row).toHaveLength(16));
  });

  it('回傳每個字母的欄範圍（連續、不留空白欄、欄寬隨字模）', () => {
    const sol = buildSolution('AIDEN');
    expect(sol.letterRanges).toEqual([
      { char: 'A', start: 0, width: 3 },
      { char: 'I', start: 3, width: 3 },
      { char: 'D', start: 6, width: 3 },
      { char: 'E', start: 9, width: 3 },
      { char: 'N', start: 12, width: 4 },
    ]);
  });

  it('G 為 4 欄字模（辨識度調整：3→4 欄）', () => {
    const sol = buildSolution('G');
    expect(sol.cols).toBe(4);
    expect(sol.letterRanges).toEqual([{ char: 'G', start: 0, width: 4 }]);
    // LEGO：L=3 E=3 G=4 O=3 → 13
    expect(buildSolution('LEGO').cols).toBe(13);
  });

  it('混合字寬（5／3 欄）累加正確 — MOYA', () => {
    const sol = buildSolution('MOYA'); // M=5, O=3, Y=3, A=3 → 14
    expect(sol.cols).toBe(14);
    expect(sol.letterRanges).toEqual([
      { char: 'M', start: 0, width: 5 },
      { char: 'O', start: 5, width: 3 },
      { char: 'Y', start: 8, width: 3 },
      { char: 'A', start: 11, width: 3 },
    ]);
  });

  it('多字母正確拼接（逐格對應字模）', () => {
    const sol = buildSolution('AIDEN');
    // A 的第 0 列 = "010"，落在欄 0–2
    expect(sol.cells[0].slice(0, 3)).toEqual([false, true, false]);
    // I 的第 1 列 = "010"，落在欄 3–5
    expect(sol.cells[1].slice(3, 6)).toEqual([false, true, false]);
    // E 的第 1 列 = "100"，落在欄 9–11
    expect(sol.cells[1].slice(9, 12)).toEqual([true, false, false]);
    // N（4 欄）的第 0 列 = "1001"，落在欄 12–15
    expect(sol.cells[0].slice(12, 16)).toEqual([true, false, false, true]);
  });

  it('大小寫不敏感', () => {
    expect(buildSolution('aiden').cells).toEqual(buildSolution('AIDEN').cells);
  });

  it('單一字母與其字模一致（含非 3 欄字模）', () => {
    const sol = buildSolution('M');
    expect(sol.cols).toBe(5);
    sol.cells.forEach((row, r) => {
      expect(row).toEqual([...FONT.M[r]].map((ch) => ch === '1'));
    });
  });

  it('空字串丟出錯誤', () => {
    expect(() => buildSolution('')).toThrow();
  });

  it('缺少字模的字元（Q，刻意不收錄）丟出錯誤', () => {
    expect(() => buildSolution('Q')).toThrow();
    expect(() => buildSolution('QUIZ')).toThrow();
  });
});

describe('letterDividerCols', () => {
  it('回傳每個非首字母的左緣欄索引', () => {
    const { letterRanges } = buildSolution('AIDEN');
    expect(letterDividerCols(letterRanges)).toEqual([3, 6, 9, 12]);
  });

  it('混合字寬下邊界隨累加位置（非固定間隔）', () => {
    const { letterRanges } = buildSolution('MOYA');
    expect(letterDividerCols(letterRanges)).toEqual([5, 8, 11]);
  });

  it('單一字母無分隔線', () => {
    expect(letterDividerCols(buildSolution('A').letterRanges)).toEqual([]);
  });
});

describe('computeClues', () => {
  it('全空的行/列回 [0]', () => {
    const cells = [
      [false, false, false],
      [false, false, false],
    ];
    const { rows, cols } = computeClues(cells);
    expect(rows).toEqual([[0], [0]]);
    expect(cols).toEqual([[0], [0], [0]]);
  });

  it('多段連續塗色（如 1 1 1）', () => {
    const cells = [
      [true, false, true, false, true],
    ];
    expect(computeClues(cells).rows).toEqual([[1, 1, 1]]);
  });

  it('連續塗色合併為單一段長度', () => {
    const cells = [
      [true, true, true, false, true],
    ];
    expect(computeClues(cells).rows).toEqual([[3, 1]]);
  });

  it('行與列方向分別計算', () => {
    const cells = [
      [true, true],
      [true, false],
    ];
    const { rows, cols } = computeClues(cells);
    expect(rows).toEqual([[2], [1]]);
    expect(cols).toEqual([[2], [1]]);
  });

  it('AIDEN 解答的提示維度正確（N 為 4 欄 → 16 欄）', () => {
    const { cells } = buildSolution('AIDEN');
    const { rows, cols } = computeClues(cells);
    expect(rows).toHaveLength(5);
    expect(cols).toHaveLength(16);
  });
});

describe('checkAnswer', () => {
  it('完全相符回 true', () => {
    expect(checkAnswer('AIDEN', 'AIDEN')).toBe(true);
  });

  it('大小寫不敏感', () => {
    expect(checkAnswer('aiden', 'AIDEN')).toBe(true);
    expect(checkAnswer('AiDeN', 'aiden')).toBe(true);
  });

  it('忽略前後空白', () => {
    expect(checkAnswer('  aiden  ', 'AIDEN')).toBe(true);
  });

  it('錯字回 false', () => {
    expect(checkAnswer('AIDAN', 'AIDEN')).toBe(false);
  });

  it('不足（未打完）回 false', () => {
    expect(checkAnswer('AID', 'AIDEN')).toBe(false);
  });

  it('空輸入回 false', () => {
    expect(checkAnswer('', 'AIDEN')).toBe(false);
  });
});

describe('isPlayable', () => {
  it('字模齊全的字回 true（含大小寫、多字寬）', () => {
    expect(isPlayable('AIDEN')).toBe(true);
    expect(isPlayable('moya')).toBe(true);
  });

  it('含未收錄字模（Q）回 false', () => {
    expect(isPlayable('Q')).toBe(false);
    expect(isPlayable('QUIZ')).toBe(false);
  });

  it('空字串／標點回 false', () => {
    expect(isPlayable('')).toBe(false);
    expect(isPlayable('SO!TO')).toBe(false);
  });
});
