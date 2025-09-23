-- 0001_seed_initial_data.sql
-- Seed initial contexts and preferences for ChurnFlow MCP

INSERT OR IGNORE INTO contexts (id, name, display_name, description, color, keywords, patterns, active, priority, created_at, updated_at)
VALUES
  ('ctx-work', 'work', 'Work', 'Professional tasks and projects', '#1976d2', '["work","business","meeting","project","client"]', '[]', 1, 10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ctx-personal', 'personal', 'Personal', 'Personal tasks and life management', '#43a047', '["personal","home","family","health","finance"]', '[]', 1, 8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ctx-system', 'system', 'System', 'ChurnFlow system maintenance', '#616161', '["system","config","setup","maintenance"]', '[]', 1, 5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT OR IGNORE INTO preferences (id, key, value, type, category, description, updated_at)
VALUES
  ('pref-review-batch', 'review_batch_size', '10', 'number', 'review', 'Number of items to review in a batch', CURRENT_TIMESTAMP),
  ('pref-confidence', 'confidence_threshold', '0.7', 'number', 'ai', 'Minimum confidence for auto-routing', CURRENT_TIMESTAMP),
  ('pref-color', 'color_output', 'true', 'boolean', 'ui', 'Enable color output in UI', CURRENT_TIMESTAMP);
