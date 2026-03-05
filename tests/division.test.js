import { describe, it, expect } from 'vitest';
import {
  generateProblem,
  calculateSteps,
  generateLayout,
  validateInput,
} from '../js/division.js';

describe('generateProblem', () => {
  it('should return divisor in range 2-9', () => {
    for (let i = 0; i < 100; i++) {
      const { divisor } = generateProblem();
      expect(divisor).toBeGreaterThanOrEqual(2);
      expect(divisor).toBeLessThanOrEqual(9);
    }
  });

  it('should return dividend in range 100-999', () => {
    for (let i = 0; i < 100; i++) {
      const { dividend } = generateProblem();
      expect(dividend).toBeGreaterThanOrEqual(100);
      expect(dividend).toBeLessThanOrEqual(999);
    }
  });

  it('should return both dividend and divisor', () => {
    const problem = generateProblem();
    expect(problem).toHaveProperty('dividend');
    expect(problem).toHaveProperty('divisor');
  });

  it('should generate 4-digit dividend when digitCount=4', () => {
    for (let i = 0; i < 50; i++) {
      const { dividend } = generateProblem(4);
      expect(dividend).toBeGreaterThanOrEqual(1000);
      expect(dividend).toBeLessThanOrEqual(9999);
    }
  });

  it('should generate 5-digit dividend when digitCount=5', () => {
    for (let i = 0; i < 50; i++) {
      const { dividend } = generateProblem(5);
      expect(dividend).toBeGreaterThanOrEqual(10000);
      expect(dividend).toBeLessThanOrEqual(99999);
    }
  });

  it('should generate 6-digit dividend when digitCount=6', () => {
    for (let i = 0; i < 50; i++) {
      const { dividend } = generateProblem(6);
      expect(dividend).toBeGreaterThanOrEqual(100000);
      expect(dividend).toBeLessThanOrEqual(999999);
    }
  });

  it('should default to 3-digit when no argument', () => {
    for (let i = 0; i < 50; i++) {
      const { dividend } = generateProblem();
      expect(dividend).toBeGreaterThanOrEqual(100);
      expect(dividend).toBeLessThanOrEqual(999);
    }
  });

  it('should accept optional divisorMin for harder divisors', () => {
    for (let i = 0; i < 50; i++) {
      const { divisor } = generateProblem(4, 7);
      expect(divisor).toBeGreaterThanOrEqual(7);
      expect(divisor).toBeLessThanOrEqual(9);
    }
  });
});

describe('calculateSteps', () => {
  it('756 ÷ 3 = 252 remainder 0', () => {
    const result = calculateSteps(756, 3);
    expect(result.quotient).toBe(252);
    expect(result.remainder).toBe(0);
    expect(result.rounds).toHaveLength(3);
  });

  it('756 ÷ 3: round 1 — 7÷3=2, product=6, subtract=1', () => {
    const { rounds } = calculateSteps(756, 3);
    expect(rounds[0].quotientDigit).toBe(2);
    expect(rounds[0].product).toBe(6);
    expect(rounds[0].subtractResult).toBe(1);
    expect(rounds[0].currentNumber).toBe(7);
  });

  it('756 ÷ 3: round 2 — 15÷3=5, product=15, subtract=0', () => {
    const { rounds } = calculateSteps(756, 3);
    expect(rounds[1].quotientDigit).toBe(5);
    expect(rounds[1].product).toBe(15);
    expect(rounds[1].subtractResult).toBe(0);
    expect(rounds[1].currentNumber).toBe(15);
  });

  it('756 ÷ 3: round 3 — 6÷3=2, product=6, subtract=0', () => {
    const { rounds } = calculateSteps(756, 3);
    expect(rounds[2].quotientDigit).toBe(2);
    expect(rounds[2].product).toBe(6);
    expect(rounds[2].subtractResult).toBe(0);
    expect(rounds[2].currentNumber).toBe(6);
  });

  it('864 ÷ 4 = 216 remainder 0', () => {
    const result = calculateSteps(864, 4);
    expect(result.quotient).toBe(216);
    expect(result.remainder).toBe(0);
    expect(result.rounds).toHaveLength(3);
  });

  it('864 ÷ 4: round details', () => {
    const { rounds } = calculateSteps(864, 4);
    // 8÷4=2, 2*4=8, 8-8=0
    expect(rounds[0]).toEqual({ currentNumber: 8, quotientDigit: 2, product: 8, subtractResult: 0 });
    // 06÷4=1, 1*4=4, 6-4=2
    expect(rounds[1]).toEqual({ currentNumber: 6, quotientDigit: 1, product: 4, subtractResult: 2 });
    // 24÷4=6, 6*4=24, 24-24=0
    expect(rounds[2]).toEqual({ currentNumber: 24, quotientDigit: 6, product: 24, subtractResult: 0 });
  });

  it('156 ÷ 3 = 052 (quotient first digit is 0)', () => {
    const result = calculateSteps(156, 3);
    expect(result.quotient).toBe(52);
    expect(result.remainder).toBe(0);
    expect(result.rounds).toHaveLength(3);
    // 1÷3=0
    expect(result.rounds[0].quotientDigit).toBe(0);
    expect(result.rounds[0].product).toBe(0);
    expect(result.rounds[0].subtractResult).toBe(1);
  });

  it('156 ÷ 3: full rounds', () => {
    const { rounds } = calculateSteps(156, 3);
    expect(rounds[0]).toEqual({ currentNumber: 1, quotientDigit: 0, product: 0, subtractResult: 1 });
    expect(rounds[1]).toEqual({ currentNumber: 15, quotientDigit: 5, product: 15, subtractResult: 0 });
    expect(rounds[2]).toEqual({ currentNumber: 6, quotientDigit: 2, product: 6, subtractResult: 0 });
  });

  it('handles remainder (100 ÷ 3 = 33 remainder 1)', () => {
    const result = calculateSteps(100, 3);
    expect(result.quotient).toBe(33);
    expect(result.remainder).toBe(1);
  });

  it('100 ÷ 3: round details', () => {
    const { rounds } = calculateSteps(100, 3);
    // 1÷3=0, 0*3=0, 1-0=1
    expect(rounds[0]).toEqual({ currentNumber: 1, quotientDigit: 0, product: 0, subtractResult: 1 });
    // 10÷3=3, 3*3=9, 10-9=1
    expect(rounds[1]).toEqual({ currentNumber: 10, quotientDigit: 3, product: 9, subtractResult: 1 });
    // 10÷3=3, 3*3=9, 10-9=1
    expect(rounds[2]).toEqual({ currentNumber: 10, quotientDigit: 3, product: 9, subtractResult: 1 });
  });

  it('handles 2-digit product (987 ÷ 2 = 493 r1)', () => {
    const result = calculateSteps(987, 2);
    expect(result.quotient).toBe(493);
    expect(result.remainder).toBe(1);
    // 9÷2=4, product=8
    expect(result.rounds[0].product).toBe(8);
    // 18÷2=9, product=18
    expect(result.rounds[1].product).toBe(18);
    expect(result.rounds[1].currentNumber).toBe(18);
  });

  it('always produces exactly 3 rounds', () => {
    const result = calculateSteps(200, 5);
    expect(result.rounds).toHaveLength(3);
    expect(result.quotient).toBe(40);
    expect(result.remainder).toBe(0);
  });

  it('handles 4-digit division (4928 ÷ 7)', () => {
    const result = calculateSteps(4928, 7);
    expect(result.quotient).toBe(704);
    expect(result.remainder).toBe(0);
    expect(result.rounds).toHaveLength(4);
  });

  it('handles 6-digit division (297456 ÷ 8)', () => {
    const result = calculateSteps(297456, 8);
    expect(result.quotient).toBe(37182);
    expect(result.remainder).toBe(0);
    expect(result.rounds).toHaveLength(6);
  });
});

describe('generateLayout', () => {
  it('returns cells array with correct types', () => {
    const steps = calculateSteps(756, 3);
    const layout = generateLayout(steps, 756, 3);
    expect(Array.isArray(layout.cells)).toBe(true);

    const types = new Set(layout.cells.map(c => c.type));
    expect(types.has('quotient')).toBe(true);
    expect(types.has('dividend')).toBe(true);
    expect(types.has('divisor')).toBe(true);
    expect(types.has('product')).toBe(true);
    expect(types.has('subtract')).toBe(true);
  });

  it('has exactly 3 quotient cells', () => {
    const steps = calculateSteps(756, 3);
    const layout = generateLayout(steps, 756, 3);
    const quotientCells = layout.cells.filter(c => c.type === 'quotient');
    expect(quotientCells).toHaveLength(3);
  });

  it('quotient cells have correct values for 756÷3', () => {
    const steps = calculateSteps(756, 3);
    const layout = generateLayout(steps, 756, 3);
    const quotientCells = layout.cells
      .filter(c => c.type === 'quotient')
      .sort((a, b) => a.col - b.col);
    expect(quotientCells.map(c => c.value)).toEqual([2, 5, 2]);
  });

  it('fillable cells are ordered sequentially', () => {
    const steps = calculateSteps(756, 3);
    const layout = generateLayout(steps, 756, 3);
    const fillable = layout.cells
      .filter(c => c.fillable)
      .sort((a, b) => a.order - b.order);
    expect(fillable.length).toBeGreaterThan(0);
    // Orders should be sequential starting from 0
    fillable.forEach((cell, i) => {
      expect(cell.order).toBe(i);
    });
  });

  it('dividend and divisor cells are not fillable', () => {
    const steps = calculateSteps(756, 3);
    const layout = generateLayout(steps, 756, 3);
    const staticCells = layout.cells.filter(
      c => c.type === 'dividend' || c.type === 'divisor'
    );
    staticCells.forEach(c => {
      expect(c.fillable).toBe(false);
    });
  });

  it('all fillable cells have numeric values 0-9', () => {
    const steps = calculateSteps(756, 3);
    const layout = generateLayout(steps, 756, 3);
    const fillable = layout.cells.filter(c => c.fillable);
    fillable.forEach(c => {
      expect(c.value).toBeGreaterThanOrEqual(0);
      expect(c.value).toBeLessThanOrEqual(9);
    });
  });
});

describe('validateInput', () => {
  it('returns true for correct digit', () => {
    const steps = calculateSteps(756, 3);
    const layout = generateLayout(steps, 756, 3);
    const firstFillable = layout.cells
      .filter(c => c.fillable)
      .sort((a, b) => a.order - b.order)[0];
    expect(validateInput(firstFillable, firstFillable.value)).toBe(true);
  });

  it('returns false for wrong digit', () => {
    const steps = calculateSteps(756, 3);
    const layout = generateLayout(steps, 756, 3);
    const firstFillable = layout.cells
      .filter(c => c.fillable)
      .sort((a, b) => a.order - b.order)[0];
    const wrongDigit = (firstFillable.value + 1) % 10;
    expect(validateInput(firstFillable, wrongDigit)).toBe(false);
  });
});
