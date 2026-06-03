import { describe, it, expect } from 'vitest';
import {
  SETTINGS_KEY,
  THEMES,
  FILL_MODES,
  DEFAULT_SETTINGS,
  normalizeSettings,
  loadSettings,
  saveSettings,
} from '../settings.js';

// 簡易 storage 替身（介面同 localStorage 的 getItem/setItem）。
function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
  };
}

describe('常數與預設', () => {
  it('鍵名與可選值', () => {
    expect(SETTINGS_KEY).toBe('nonogram:settings');
    expect(THEMES).toEqual(['playful', 'clean']);
    expect(FILL_MODES).toEqual(['mono', 'letter']);
  });

  it('預設為童趣 + 單色', () => {
    expect(DEFAULT_SETTINGS).toEqual({ theme: 'playful', fillMode: 'mono' });
  });
});

describe('normalizeSettings', () => {
  it('合法值原樣保留', () => {
    expect(normalizeSettings({ theme: 'clean', fillMode: 'letter' })).toEqual({
      theme: 'clean',
      fillMode: 'letter',
    });
  });

  it('未知／缺漏欄位回落到預設', () => {
    expect(normalizeSettings({ theme: 'rainbow' })).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings({ fillMode: 'letter' })).toEqual({
      theme: 'playful',
      fillMode: 'letter',
    });
  });

  it('null／非物件回全預設', () => {
    expect(normalizeSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings('nope')).toEqual(DEFAULT_SETTINGS);
    expect(normalizeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });
});

describe('loadSettings / saveSettings（注入 storage、可往返）', () => {
  it('空 storage 回預設', () => {
    expect(loadSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS);
  });

  it('讀回先前存的設定', () => {
    const storage = fakeStorage({
      [SETTINGS_KEY]: JSON.stringify({ theme: 'clean', fillMode: 'letter' }),
    });
    expect(loadSettings(storage)).toEqual({ theme: 'clean', fillMode: 'letter' });
  });

  it('壞資料／非物件一律回預設', () => {
    expect(loadSettings(fakeStorage({ [SETTINGS_KEY]: 'not-json' }))).toEqual(DEFAULT_SETTINGS);
    expect(loadSettings(fakeStorage({ [SETTINGS_KEY]: JSON.stringify([1, 2]) }))).toEqual(
      DEFAULT_SETTINGS
    );
  });

  it('save 後再 load 可往返（並沿途正規化掉非法值）', () => {
    const storage = fakeStorage();
    saveSettings(storage, { theme: 'clean', fillMode: 'bogus' });
    expect(loadSettings(storage)).toEqual({ theme: 'clean', fillMode: 'mono' });
  });

  it('storage 丟錯時 saveSettings 不向外拋（如隱私模式）', () => {
    const throwing = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceeded');
      },
    };
    expect(() => saveSettings(throwing, DEFAULT_SETTINGS)).not.toThrow();
  });
});
