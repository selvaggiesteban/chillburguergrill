-- Add modifier group columns to the extras table to support "Choose 1" or "Required" logic
ALTER TABLE extras ADD COLUMN group_id TEXT;
ALTER TABLE extras ADD COLUMN is_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE extras ADD COLUMN max_selection INTEGER DEFAULT NULL;
