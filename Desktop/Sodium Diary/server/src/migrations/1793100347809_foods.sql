-- Up Migration
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE foods (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name     text NOT NULL,
  source             text NOT NULL CHECK (source IN ('usda_seed', 'usda_api', 'curated')),
  source_ref         text NOT NULL,
  sodium_mg_per_100g numeric(10,3) NOT NULL CHECK (sodium_mg_per_100g >= 0),
  verified           boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (source, source_ref)
);

CREATE TABLE food_aliases (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id          uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  alias_normalized text NOT NULL
    CHECK (alias_normalized = lower(btrim(alias_normalized)) AND alias_normalized <> ''),
  UNIQUE (food_id, alias_normalized)
);
CREATE INDEX food_aliases_trgm_idx ON food_aliases USING gin (alias_normalized gin_trgm_ops);

CREATE TABLE food_servings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id     uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  unit_code   text NOT NULL CHECK (unit_code ~ '^[a-z_]+$'),
  description text,
  grams       numeric(10,3) NOT NULL CHECK (grams > 0),
  is_default  boolean NOT NULL DEFAULT false,
  UNIQUE (food_id, unit_code)
);
CREATE UNIQUE INDEX food_servings_one_default_idx ON food_servings (food_id) WHERE is_default;

-- Down Migration
DROP TABLE food_servings;
DROP TABLE food_aliases;
DROP TABLE foods;