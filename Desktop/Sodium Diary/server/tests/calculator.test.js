import { describe, expect, it } from 'vitest';
import { calculateSodium } from '../src/services/calculator.js';

const egg = { sodiumMgPer100g: 142, servings: [{ unit_code: 'piece', grams: 50 }] };
const bread = { sodiumMgPer100g: 490, servings: [{ unit_code: 'slice', grams: 29 }] };

describe('calculateSodium: correct results', () => {
  it('2 eggs', () => {
    const r = calculateSodium({ quantity: 2, unit: 'piece', ...egg });
    expect(r.grams_consumed).toBe('100');
    expect(r.sodium_mg).toBe('142');
    expect(r.salt_g).toBe('0.355');
    expect(r.salt_factor).toBe('2.5');
    expect(r.serving_grams_snapshot).toBe('50');
  });

  it('150 g chicken breast', () => {
    const r = calculateSodium({ quantity: 150, unit: 'g', sodiumMgPer100g: 45 });
    expect(r.grams_consumed).toBe('150');
    expect(r.sodium_mg).toBe('67.5');
    expect(r.salt_g).toBe('0.16875');
    expect(r.serving_grams_snapshot).toBeNull();
  });

  it('2 slices of bread', () => {
    const r = calculateSodium({ quantity: 2, unit: 'slice', ...bread });
    expect(r.grams_consumed).toBe('58');
    expect(r.sodium_mg).toBe('284.2');
    expect(r.salt_g).toBe('0.7105');
  });

  it('100 g tofu', () => {
    const r = calculateSodium({ quantity: 100, unit: 'g', sodiumMgPer100g: 14 });
    expect(r.sodium_mg).toBe('14');
    expect(r.salt_g).toBe('0.035');
  });

  it('converts ounces to grams', () => {
    const r = calculateSodium({ quantity: 1, unit: 'oz', sodiumMgPer100g: 100 });
    expect(r.grams_consumed).toBe('28.349523125');
  });

  it('has no floating-point drift', () => {
    const r = calculateSodium({ quantity: 0.3, unit: 'g', sodiumMgPer100g: 100 });
    expect(r.sodium_mg).toBe('0.3');
  });

  it('allows a food with 0 mg sodium', () => {
    const r = calculateSodium({ quantity: 100, unit: 'g', sodiumMgPer100g: 0 });
    expect(r.sodium_mg).toBe('0');
    expect(r.salt_g).toBe('0');
  });
});

describe('calculateSodium: refuses to guess', () => {
  it.each([[0], [-1], ['abc'], [NaN], [null]])('rejects quantity %s', (quantity) => {
    expect(() => calculateSodium({ quantity, unit: 'g', sodiumMgPer100g: 100 })).toThrow(
      expect.objectContaining({ code: 'INVALID_QUANTITY' }),
    );
  });

  it('rejects a unit with no known serving size', () => {
    expect(() => calculateSodium({ quantity: 1, unit: 'bowl', ...egg })).toThrow(
      expect.objectContaining({ code: 'NO_SERVING_FOR_UNIT' }),
    );
  });

  it.each([[null], [-5]])('rejects sodium value %s', (sodiumMgPer100g) => {
    expect(() => calculateSodium({ quantity: 1, unit: 'g', sodiumMgPer100g })).toThrow(
      expect.objectContaining({ code: 'INVALID_NUTRITION_DATA' }),
    );
  });

  it('rejects absurdly large amounts', () => {
    expect(() => calculateSodium({ quantity: 10, unit: 'kg', sodiumMgPer100g: 100 })).toThrow(
      expect.objectContaining({ code: 'QUANTITY_TOO_LARGE' }),
    );
  });
});