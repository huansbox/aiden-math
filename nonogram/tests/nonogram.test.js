import { describe, it, expect } from 'vitest';
import {
  buildSolution,
  computeClues,
  checkAnswer,
  diffCells,
  letterDividerCols,
  isPlayable,
  validateWord,
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

describe('diffCells', () => {
  // 小型自製解答便於逐格驗證（2×3，左上、右下塗色）
  const solution = {
    rows: 2,
    cols: 3,
    cells: [
      [true, false, false],
      [false, false, true],
    ],
  };

  it('完全正確時 extra/missing 皆為空', () => {
    const filled = [
      [true, false, false],
      [false, false, true],
    ];
    expect(diffCells(filled, solution)).toEqual({ extra: [], missing: [] });
  });

  it('多塗（extra）= 有塗但解答不該塗', () => {
    const filled = [
      [true, true, false], // (0,1) 多塗
      [false, false, true],
    ];
    expect(diffCells(filled, solution)).toEqual({
      extra: [{ r: 0, c: 1 }],
      missing: [],
    });
  });

  it('漏塗（missing）= 解答該塗但沒塗', () => {
    const filled = [
      [true, false, false],
      [false, false, false], // (1,2) 漏塗
    ];
    expect(diffCells(filled, solution)).toEqual({
      extra: [],
      missing: [{ r: 1, c: 2 }],
    });
  });

  it('同時有多塗與漏塗，皆以列優先（row-major）排序回傳', () => {
    const filled = [
      [false, true, false], // (0,0) 漏塗、(0,1) 多塗
      [false, false, false], // (1,2) 漏塗
    ];
    expect(diffCells(filled, solution)).toEqual({
      extra: [{ r: 0, c: 1 }],
      missing: [{ r: 0, c: 0 }, { r: 1, c: 2 }],
    });
  });

  it('全空格盤：解答所有塗色格皆列為漏塗、無多塗', () => {
    const filled = [
      [false, false, false],
      [false, false, false],
    ];
    expect(diffCells(filled, solution)).toEqual({
      extra: [],
      missing: [{ r: 0, c: 0 }, { r: 1, c: 2 }],
    });
  });

  it('容忍稀疏 / 缺列的 filled（未塗格視為 false）', () => {
    // filled 只給第 0 列，第 1 列整列缺省
    const filled = [[true]];
    expect(diffCells(filled, solution)).toEqual({
      extra: [],
      missing: [{ r: 1, c: 2 }],
    });
  });

  it('套在真實題目（AIDEN）：完全照解答塗 → 無差異', () => {
    const sol = buildSolution('AIDEN');
    const { extra, missing } = diffCells(sol.cells, sol);
    expect(extra).toEqual([]);
    expect(missing).toEqual([]);
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

describe('validateWord（自訂出題的輸入閘）', () => {
  it('可玩的字回 ok 並正規化（去空白、轉大寫）', () => {
    expect(validateWord('  love  ')).toEqual({ ok: true, word: 'LOVE' });
    expect(validateWord('520')).toEqual({ ok: true, word: '520' });
  });

  it('空字串／全空白回 reason: empty', () => {
    expect(validateWord('')).toEqual({ ok: false, reason: 'empty' });
    expect(validateWord('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('含 Q 的字另給 reason: has-q（供友善提示，與其他不可玩字區分）', () => {
    expect(validateWord('QUIZ')).toEqual({ ok: false, reason: 'has-q' });
    expect(validateWord('iraq')).toEqual({ ok: false, reason: 'has-q' });
  });

  it('其他無法生成的字回 reason: unsupported', () => {
    expect(validateWord('SO!TO')).toEqual({ ok: false, reason: 'unsupported' });
  });
});

// 代表性單字（含數字題）的攤平與提示，作為自訂出題的回歸保護（#6 驗收）。
describe('代表性單字 buildSolution / computeClues', () => {
  it('數字題 520（皆 3 欄 → 9 欄）攤平與提示正確', () => {
    const sol = buildSolution('520');
    expect(sol.cols).toBe(9);
    expect(sol.letterRanges).toEqual([
      { char: '5', start: 0, width: 3 },
      { char: '2', start: 3, width: 3 },
      { char: '0', start: 6, width: 3 },
    ]);
    const { rows, cols } = computeClues(sol.cells);
    // 第 0 列三個字模首列皆 "111" → 整列連塗 9 格
    expect(rows[0]).toEqual([9]);
    // 第 0 欄 = 5/2/0 各自首欄："1","1","1","0","1" → 連塗 3 + 1
    expect(cols[0]).toEqual([3, 1]);
  });

  it('混合字寬單字 LOVE（L3 O3 V3 E3 → 12 欄）', () => {
    const sol = buildSolution('LOVE');
    expect(sol.cols).toBe(12);
    expect(computeClues(sol.cells).cols).toHaveLength(12);
  });
});
