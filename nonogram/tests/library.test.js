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
  nextUnsolvedIndex,
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
  it('解析出目前題庫的 11 題', () => {
    expect(parseWordlist(wordlistText)).toEqual([
      'MOYA',
      'SOTO',
      'AIDEN',
      'LEGO',
      'EAGLE',
      'TATIS',
      'TYK',
      'OUT',
      'RUN',
      'HIT',
      '932',
    ]);
  });

  it('每個單字 buildSolution 都不丟錯', () => {
    const words = parseWordlist(wordlistText);
    expect(words.length).toBeGreaterThan(0);
    words.forEach((word) => expect(() => buildSolution(word)).not.toThrow());
  });

  // 格盤寬度護欄：決定寬度的是「總欄數」（各字模欄寬累加，見 font.js），不是「字母數」
  // ——MWW 3 字母卻 15 欄。閾值 18 = 現有最寬 AIDEN/EAGLE(16) + 2 欄緩衝；再寬手機格子
  // 會頂 14px 下限、偏擠。加字超標就在此紅燈（精確擋下，取代 skill 舊有的「4–5 字母」粗估）。
  it('每個單字的格盤欄數不超過 18（窄螢幕寬度護欄）', () => {
    const MAX_COLS = 18;
    const tooWide = parseWordlist(wordlistText)
      .map((word) => ({ word, cols: buildSolution(word).cols }))
      .filter(({ cols }) => cols > MAX_COLS);
    expect(tooWide).toEqual([]);
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

describe('nextUnsolvedIndex', () => {
  const words = ['MOYA', 'SOTO', 'AIDEN', 'LEGO', 'EAGLE', 'TATIS'];

  it('沒有任何過關時，回緊接的下一題', () => {
    expect(nextUnsolvedIndex([], words, 0)).toBe(1);
    expect(nextUnsolvedIndex([], words, 4)).toBe(5);
  });

  it('跳過已過關的題，停在下一個未過關（環狀）', () => {
    // SOTO(1)、LEGO(3) 已過關；從 0 出發應跳過 1 落在 2
    const solved = markSolved(markSolved([], 'SOTO'), 'LEGO');
    expect(nextUnsolvedIndex(solved, words, 0)).toBe(2);
    // 從 2 出發：3 已過關 → 落在 4
    expect(nextUnsolvedIndex(solved, words, 2)).toBe(4);
    // 從 5 出發環狀回頭：0 未過關 → 落在 0
    expect(nextUnsolvedIndex(solved, words, 5)).toBe(0);
  });

  it('使用者範例：只剩 2、4 未過關，從 0 出發跳到 2（索引 1）', () => {
    // 「第 2、4 題」= 索引 1、3 未過關，其餘已過關
    const solved = ['MOYA', 'AIDEN', 'EAGLE', 'TATIS'].reduce(markSolved, []);
    expect(nextUnsolvedIndex(solved, words, 0)).toBe(1);
    expect(nextUnsolvedIndex(solved, words, 1)).toBe(3);
    expect(nextUnsolvedIndex(solved, words, 3)).toBe(1); // 環狀回到 1
  });

  it('全部過關回 null（進入「全部過關」畫面）', () => {
    const allSolved = words.reduce(markSolved, []);
    expect(nextUnsolvedIndex(allSolved, words, 2)).toBe(null);
  });

  it('空題庫回 null', () => {
    expect(nextUnsolvedIndex([], [], 0)).toBe(null);
  });
});
