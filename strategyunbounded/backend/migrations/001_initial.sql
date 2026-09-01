CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  id                      TEXT PRIMARY KEY,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                  TEXT NOT NULL DEFAULT 'active',
  system_prompt_snapshot  TEXT NOT NULL,
  problems_hash           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_hash ON sessions(problems_hash);

CREATE TABLE IF NOT EXISTS problems (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  idx         INTEGER NOT NULL,
  text        TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_problems_session ON problems(session_id);

CREATE TABLE IF NOT EXISTS use_cases (
  id                 TEXT PRIMARY KEY,
  session_id         TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  problem_id         TEXT NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  problem_index      INTEGER NOT NULL,
  title              TEXT NOT NULL,
  summary            TEXT NOT NULL,
  ai_priority        INTEGER,
  user_priority      INTEGER,
  feedback           TEXT,
  description        TEXT NOT NULL,
  how_it_works       TEXT[] NOT NULL,
  data_required      TEXT NOT NULL,
  time_to_implement  TEXT NOT NULL,
  complexity         TEXT NOT NULL,
  estimated_cost_roi TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_session_user_priority
  ON use_cases (session_id, user_priority)
  WHERE user_priority IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_use_cases_session ON use_cases(session_id);
CREATE INDEX IF NOT EXISTS idx_use_cases_problem ON use_cases(problem_id);

ALTER TABLE use_cases ADD COLUMN IF NOT EXISTS also_addresses INTEGER[] NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS discussion_entries (
  id            TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  speaker_label TEXT,
  transcript    TEXT NOT NULL,
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_discussion_entries_session
  ON discussion_entries(session_id, recorded_at);

CREATE TABLE IF NOT EXISTS stage2_results (
  id                       TEXT PRIMARY KEY,
  session_id               TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  use_case_id              TEXT NOT NULL REFERENCES use_cases(id),
  status                   TEXT NOT NULL DEFAULT 'generating',
  discussion_reasoning     TEXT,
  recommended_use_case_id  TEXT REFERENCES use_cases(id),
  representation_type      TEXT,
  representation_payload   JSONB,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_stage2_session
  ON stage2_results(session_id);

CREATE TABLE IF NOT EXISTS stage2_annotations (
  id          TEXT PRIMARY KEY,
  stage2_id   TEXT NOT NULL REFERENCES stage2_results(id) ON DELETE CASCADE,
  element_key TEXT NOT NULL,
  comment     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
