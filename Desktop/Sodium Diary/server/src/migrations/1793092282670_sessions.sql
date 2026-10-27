-- Up Migration
CREATE TABLE sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash          bytea NOT NULL UNIQUE,
  expires_at          timestamptz NOT NULL,
  absolute_expires_at timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_user_id_idx ON sessions (user_id);

-- Down Migration
DROP TABLE sessions;