-- 0000_initial_schema.sql
-- Initial schema for ChurnFlow MCP database

CREATE TABLE IF NOT EXISTS contexts (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  color TEXT,
  keywords TEXT DEFAULT '[]',
  patterns TEXT DEFAULT '[]',
  active INTEGER DEFAULT 1,
  priority INTEGER DEFAULT 0,
  created_at TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS captures (
  id TEXT PRIMARY KEY,
  content TEXT NOT NULL,
  raw_input TEXT,
  capture_type TEXT DEFAULT 'action' NOT NULL,
  priority TEXT DEFAULT 'medium' NOT NULL,
  status TEXT DEFAULT 'inbox' NOT NULL,
  context_id TEXT,
  confidence REAL,
  ai_reasoning TEXT,
  tags TEXT DEFAULT '[]',
  context_tags TEXT DEFAULT '[]',
  keywords TEXT DEFAULT '[]',
  start_date TEXT,
  due_date TEXT,
  completed_at TEXT,
  last_reviewed_at TEXT,
  review_score REAL,
  review_notes TEXT,
  capture_source TEXT DEFAULT 'manual',
  created_at TEXT,
  updated_at TEXT,
  FOREIGN KEY (context_id) REFERENCES contexts(id)
);

CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  type TEXT DEFAULT 'string',
  category TEXT DEFAULT 'general',
  description TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  description TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS learning_patterns (
  id TEXT PRIMARY KEY,
  input_keywords TEXT DEFAULT '[]',
  input_length INTEGER,
  input_patterns TEXT DEFAULT '[]',
  chosen_context_id TEXT,
  chosen_type TEXT NOT NULL,
  original_confidence REAL NOT NULL,
  was_correct INTEGER,
  user_corrected_context_id TEXT,
  user_corrected_type TEXT,
  weight REAL DEFAULT 1,
  created_at TEXT,
  FOREIGN KEY (chosen_context_id) REFERENCES contexts(id),
  FOREIGN KEY (user_corrected_context_id) REFERENCES contexts(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS contexts_name_unique ON contexts (name);
CREATE UNIQUE INDEX IF NOT EXISTS preferences_key_unique ON preferences (key);
