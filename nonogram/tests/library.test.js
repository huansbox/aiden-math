import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseWordlist,
  BUILTIN_PREFIX,
  PROGRESS_KEY,
  builtinKey,
  isSolved,
  markSolved,
  nextIndex,
  loadProgress,
  saveProgress,
} from '../library.js';
import { buildSolution } from '../nonogram.js';

const here = dirname(fileURLToPath(import.meta.url));
const wordlistText = readFileSync(join(here, '..', 'wordlist.txt'), 'utf8');

// 簡易 storage 替身（介面同 localStorage 的 getItem/setItem）。
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

describe('parseWordlist', () => {
  it('一行一字、去前後空白、轉大寫', () => {
    expect(parseWordlist('moya\nSOTO\n  aiden  ')).toEqual(['MOYA', 'SOTO', 'AIDEN']);
  });

  it('略過空行', () => {
    expect(parseWordlist('A\n\n\nB\n')).toEqual(['A', 'B']);
  });

  it('略過 # 註解行', () => {
    expect(parseWordlist('# 這是註解\nMOYA\n#another\nSOTO')).toEqual(['MOYA', 'SOTO']);
  });

  it('過濾掉不可玩的字（含 Q 與標點）', () => {
    expect(parseWordlist('MOYA\nQUIZ\nSO!TO\nLEGO')).toEqual(['MOYA', 'LEGO']);
  });
});

describe('wordlist.txt 全部單字皆可玩（#5 驗收）', () => {
  it('解析出目前題庫的 6 題', () => {
    expect(parseWordlist(wordlistText)).toEqual([
      'MOYA',
      'SOTO',
      'AIDEN',
      'LEGO',
      'EAGLE',
      'TATIS',
    ]);
  });

  it('每個單字 buildSolution 都不丟錯', () => {
    const words = parseWordlist(wordlistText);
    expect(words.length).toBeGreaterThan(0);
    words.forEach((word) => expect(() => buildSolution(word)).not.toThrow());
  });
});

describe('過關紀錄（builtin 命名空間、以單字為 key）', () => {
  it('builtinKey 帶 builtin: 前綴且大小寫正規化', () => {
    expect(BUILTIN_PREFIX).toBe('builtin:');
    expect(builtinKey('AIDEN')).toBe('builtin:AIDEN');
    expect(builtinKey('aiden')).toBe('builtin:AIDEN');
  });

  it('markSolved 後可由 isSolved 查到，未標記者為 false', () => {
    let solved = [];
    expect(isSolved(solved, 'AIDEN')).toBe(false);
    solved = markSolved(solved, 'AIDEN');
    expect(isSolved(solved, 'AIDEN')).toBe(true);
    expect(isSolved(solved, 'MOYA')).toBe(false);
  });

  it('key 隨單字而非序號 → 重排題庫不影響既有★', () => {
    // 以單字為準，因此查詢只看單字本身，與它在題庫的位置無關。
    const solved = markSolved([], 'LEGO');
    expect(isSolved(solved, 'LEGO')).toBe(true);
    expect(solved).toEqual(['builtin:LEGO']);
  });

  it('markSolved 不重複加入（idempotent）', () => {
    let solved = markSolved([], 'SOTO');
    solved = markSolved(solved, 'SOTO');
    expect(solved).toEqual(['builtin:SOTO']);
  });

  it('markSolved 不可變（不動到原陣列，回傳新陣列）', () => {
    const original = [];
    const next = markSolved(original, 'MOYA');
    expect(original).toEqual([]);
    expect(next).toEqual(['builtin:MOYA']);
  });
});

describe('loadProgress / saveProgress（注入 storage、可測試）', () => {
  it('空 storage 回 []', () => {
    expect(loadProgress(fakeStorage())).toEqual([]);
  });

  it('讀回先前存的陣列', () => {
    const storage = fakeStorage({ [PROGRESS_KEY]: JSON.stringify(['builtin:AIDEN']) });
    expect(loadProgress(storage)).toEqual(['builtin:AIDEN']);
  });

  it('壞資料／非陣列一律回 []', () => {
    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: 'not-json' }))).toEqual([]);
    expect(loadProgress(fakeStorage({ [PROGRESS_KEY]: JSON.stringify({ a: 1 }) }))).toEqual([]);
  });

  it('save 後再 load 可往返（round-trip）', () => {
    const storage = fakeStorage();
    const solved = markSolved(markSolved([], 'AIDEN'), 'LEGO');
    saveProgress(storage, solved);
    expect(loadProgress(storage)).toEqual(['builtin:AIDEN', 'builtin:LEGO']);
  });

  it('storage 丟錯時 saveProgress 不向外拋（如隱私模式）', () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    };
    expect(() => saveProgress(throwing, ['builtin:AIDEN'])).not.toThrow();
  });
});

describe('nextIndex', () => {
  it('回傳題庫順序的下一題', () => {
    expect(nextIndex(0, 6)).toBe(1);
    expect(nextIndex(4, 6)).toBe(5);
  });

  it('最後一題折返第一題', () => {
    expect(nextIndex(5, 6)).toBe(0);
  });

  it('空題庫回 null', () => {
    expect(nextIndex(0, 0)).toBe(null);
  });
});
