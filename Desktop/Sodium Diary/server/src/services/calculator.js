import Decimal from 'decimal.js';

export const SALT_FACTOR = '2.5'; // g of salt per g of sodium (label convention)
export const CALC_VERSION = 'v1';

const WEIGHT_UNIT_GRAMS = { g: '1', kg: '1000', oz: '28.349523125', lb: '453.59237' };
const MAX_GRAMS = new Decimal(5000);

export class CalcError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'CalcError';
    this.code = code;
  }
}

function toDecimal(value, code, message) {
  try {
    const d = new Decimal(value);
    if (!d.isFinite()) throw new Error('not finite');
    return d;
  } catch {
    throw new CalcError(code, message);
  }
}

export function calculateSodium({ quantity, unit, sodiumMgPer100g, servings = [] }) {
  const q = toDecimal(quantity, 'INVALID_QUANTITY', 'Quantity must be a number.');
  if (!q.gt(0)) throw new CalcError('INVALID_QUANTITY', 'Quantity must be greater than zero.');

  const na = toDecimal(sodiumMgPer100g, 'INVALID_NUTRITION_DATA', 'Sodium value is missing or invalid.');
  if (na.lt(0)) throw new CalcError('INVALID_NUTRITION_DATA', 'Sodium value is missing or invalid.');

  let gramsPerUnit;
  let servingGrams = null;
  if (typeof unit === 'string' && Object.hasOwn(WEIGHT_UNIT_GRAMS, unit)) {
    gramsPerUnit = new Decimal(WEIGHT_UNIT_GRAMS[unit]);
  } else {
    const serving = servings.find((s) => s.unit_code === unit);
    if (!serving) {
      throw new CalcError('NO_SERVING_FOR_UNIT', `No serving size is known for "${unit}".`);
    }
    gramsPerUnit = toDecimal(serving.grams, 'INVALID_NUTRITION_DATA', 'Serving size is invalid.');
    if (!gramsPerUnit.gt(0)) throw new CalcError('INVALID_NUTRITION_DATA', 'Serving size is invalid.');
    servingGrams = gramsPerUnit.toString();
  }

  const grams = q.mul(gramsPerUnit);
  if (grams.gt(MAX_GRAMS)) {
    throw new CalcError('QUANTITY_TOO_LARGE', 'That amount is unusually large. Please check the quantity.');
  }

  const sodiumMg = na.mul(grams).div(100);
  const saltG = sodiumMg.mul(SALT_FACTOR).div(1000);

  return {
    grams_consumed: grams.toString(),
    sodium_mg: sodiumMg.toString(),
    salt_g: saltG.toString(),
    salt_factor: SALT_FACTOR,
    calc_version: CALC_VERSION,
    serving_grams_snapshot: servingGrams,
    steps: [
      `grams = ${q} x ${gramsPerUnit} g = ${grams} g`,
      `sodium = ${na} mg/100g x ${grams} g / 100 = ${sodiumMg} mg`,
      `salt = ${sodiumMg} mg x ${SALT_FACTOR} / 1000 = ${saltG} g`,
    ],
  };
}