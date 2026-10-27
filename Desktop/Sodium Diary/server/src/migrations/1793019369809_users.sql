-- Up Migration
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE users (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email           citext NOT NULL UNIQUE,
    password_hash   text NOT NULL,
    timezone        text NOT NULL DEFAULT 'UTC',
    created_at      timestamptz NOT NULL DEFAULT now()
);

-- Down Migration
DROP TABLE users;