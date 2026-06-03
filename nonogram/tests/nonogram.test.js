import { describe, it, expect } from 'vitest';
import {
  buildSolution,
  computeClues,
  checkAnswer,
  LETTER_ROWS,
  LETTER_COLS,
} from '../nonogram.js';
import { FONT } from '../font.js';

describe('buildSolution', () => {
  it('攤平成 5 × (3·長度) 的點陣', () => {
    const sol = buildSolution('AIDEN');
    expect(sol.rows).toBe(LETTER_ROWS);
    expect(sol.cols).toBe(5 * LETTER_COLS); // 15
    expect(sol.cells).toHaveLength(5);
    sol.cells.forEach((row) => expect(row).toHaveLength(15));
  });

  it('回傳每個字母的欄範圍（連續、不留空白欄）', () => {
    const sol = buildSolution('AIDEN');
    expect(sol.letterRanges).toEqual([
      { char: 'A', start: 0, width: 3 },
      { char: 'I', start: 3, width: 3 },
      { char: 'D', start: 6, width: 3 },
      { char: 'E', start: 9, width: 3 },
      { char: 'N', start: 12, width: 3 },
    ]);
  });

  it('多字母正確拼接（逐格對應字模）', () => {
    const sol = buildSolution('AIDEN');
    // A 的第 0 列 = "111"（全塗），落在欄 0–2
    expect(sol.cells[0].slice(0, 3)).toEqual([true, true, true]);
    // I 的第 1 列 = "010"，落在欄 3–5
    expect(sol.cells[1].slice(3, 6)).toEqual([false, true, false]);
    // E 的第 1 列 = "100"，落在欄 9–11
    expect(sol.cells[1].slice(9, 12)).toEqual([true, false, false]);
  });

  it('大小寫不敏感', () => {
    expect(buildSolution('aiden').cells).toEqual(buildSolution('AIDEN').cells);
  });

  it('單一字母與其字模一致', () => {
    const sol = buildSolution('A');
    sol.cells.forEach((row, r) => {
      expect(row).toEqual([...FONT.A[r]].map((ch) => ch === '1'));
    });
  });

  it('空字串丟出錯誤', () => {
    expect(() => buildSolution('')).toThrow();
  });

  it('缺少字模的字元丟出錯誤', () => {
    expect(() => buildSolution('Z')).toThrow();
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

  it('AIDEN 解答的提示維度正確', () => {
    const { cells } = buildSolution('AIDEN');
    const { rows, cols } = computeClues(cells);
    expect(rows).toHaveLength(5);
    expect(cols).toHaveLength(15);
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
