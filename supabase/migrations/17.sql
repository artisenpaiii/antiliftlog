-- Add block_id to day_rows for efficient block-scoped realtime subscriptions

ALTER TABLE day_rows ADD COLUMN block_id uuid REFERENCES blocks(id) ON DELETE CASCADE;

UPDATE day_rows dr
SET block_id = w.block_id
FROM days d
JOIN weeks w ON w.id = d.week_id
WHERE dr.day_id = d.id;

ALTER TABLE day_rows ALTER COLUMN block_id SET NOT NULL;

CREATE INDEX day_rows_block_id_idx ON day_rows(block_id);

-- Add block_id to day_columns

ALTER TABLE day_columns ADD COLUMN block_id uuid REFERENCES blocks(id) ON DELETE CASCADE;

UPDATE day_columns dc
SET block_id = w.block_id
FROM days d
JOIN weeks w ON w.id = d.week_id
WHERE dc.day_id = d.id;

ALTER TABLE day_columns ALTER COLUMN block_id SET NOT NULL;

CREATE INDEX day_columns_block_id_idx ON day_columns(block_id);

-- Triggers: automatically populate block_id on INSERT (caller does not need to supply it)

CREATE OR REPLACE FUNCTION set_block_id_on_day_rows()
RETURNS TRIGGER AS $$
BEGIN
  SELECT w.block_id INTO NEW.block_id
  FROM days d
  JOIN weeks w ON w.id = d.week_id
  WHERE d.id = NEW.day_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_day_rows_block_id
  BEFORE INSERT ON day_rows
  FOR EACH ROW EXECUTE FUNCTION set_block_id_on_day_rows();

CREATE OR REPLACE FUNCTION set_block_id_on_day_columns()
RETURNS TRIGGER AS $$
BEGIN
  SELECT w.block_id INTO NEW.block_id
  FROM days d
  JOIN weeks w ON w.id = d.week_id
  WHERE d.id = NEW.day_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_day_columns_block_id
  BEFORE INSERT ON day_columns
  FOR EACH ROW EXECUTE FUNCTION set_block_id_on_day_columns();
