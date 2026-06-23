-- PortabIA — schéma DB isolé (portabia_db). Conçu par E²SN — Guillaume BOUTON. Apache-2.0.
-- Confidentialité 2 couches : on ne stocke JAMAIS le contenu migré ; seulement
-- l'identité du compte + des métadonnées d'action.

CREATE TABLE IF NOT EXISTS users (
  id                    SERIAL PRIMARY KEY,
  email                 TEXT UNIQUE NOT NULL,
  password_hash         TEXT NOT NULL,
  name                  TEXT NOT NULL,
  phone                 TEXT,
  professional_function TEXT,
  organization          TEXT,
  -- Consentement CNIL au rappel téléphonique (libre, explicite, révocable, tracé)
  consent_callback      BOOLEAN NOT NULL DEFAULT FALSE,
  consent_callback_at   TIMESTAMPTZ,
  email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
  verify_token          TEXT,
  status                TEXT NOT NULL DEFAULT 'active',
  failed_logins         INT NOT NULL DEFAULT 0,
  locked_until          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Historique d'actions : MÉTADONNÉES uniquement (jamais le contenu).
CREATE TABLE IF NOT EXISTS action_history (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  source_ai   TEXT NOT NULL,
  target_ai   TEXT NOT NULL,
  axes        JSONB NOT NULL DEFAULT '[]',
  scope       TEXT,
  label       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_history_user ON action_history(user_id);

-- Parrainage : on ne conserve PAS l'e-mail de l'invité après envoi (RGPD/CNIL).
-- On garde un hash pour idempotence/anti-abus + horodatage.
CREATE TABLE IF NOT EXISTS referrals (
  id              SERIAL PRIMARY KEY,
  user_id         INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_hash    TEXT NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals(user_id);

-- Avis in-app (modération, anti-spam). user_id nullable pour avis anonyme modéré.
CREATE TABLE IF NOT EXISTS reviews (
  id          SERIAL PRIMARY KEY,
  user_id     INT REFERENCES users(id) ON DELETE SET NULL,
  author_name TEXT,
  rating      INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'pending', -- pending|approved|rejected
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON reviews(status);
