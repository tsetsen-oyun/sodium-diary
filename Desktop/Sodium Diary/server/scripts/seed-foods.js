import 'dotenv/config';
import fs from 'node:fs';
import { pool } from '../src/db.js';

const foods = JSON.parse(fs.readFileSync(new URL('../data/foods.json', import.meta.url), 'utf8'));

const client = await pool.connect();
try {
  await client.query('BEGIN');

  for (const f of foods) {
    const { rows } = await client.query(
      `INSERT INTO foods (canonical_name, source, source_ref, sodium_mg_per_100g, verified)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (source, source_ref) DO UPDATE
         SET canonical_name = EXCLUDED.canonical_name,
             sodium_mg_per_100g = EXCLUDED.sodium_mg_per_100g
       RETURNING id`,
      [f.canonical_name, f.source, f.source_ref, f.sodium_mg_per_100g],
    );
    const foodId = rows[0].id;

    for (const alias of f.aliases) {
      await client.query(
        `INSERT INTO food_aliases (food_id, alias_normalized)
         VALUES ($1, $2)
         ON CONFLICT (food_id, alias_normalized) DO NOTHING`,
        [foodId, alias.trim().toLowerCase()],
      );
    }

    for (const s of f.servings) {
      await client.query(
        `INSERT INTO food_servings (food_id, unit_code, description, grams, is_default)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (food_id, unit_code) DO UPDATE
           SET description = EXCLUDED.description,
               grams = EXCLUDED.grams,
               is_default = EXCLUDED.is_default`,
        [foodId, s.unit_code, s.description, s.grams, s.is_default],
      );
    }
  }

  await client.query('COMMIT');
  console.log(`Seeded ${foods.length} foods.`);
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();
  await pool.end();
}