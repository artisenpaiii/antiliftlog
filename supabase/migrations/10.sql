 -- Drop existing foreign keys and re-add with ON DELETE CASCADE

  -- days → references weeks
  ALTER TABLE days DROP CONSTRAINT days_week_id_fkey;
  ALTER TABLE days ADD CONSTRAINT days_week_id_fkey
    FOREIGN KEY (week_id) REFERENCES weeks(id) ON DELETE CASCADE;

  -- day_columns → references days
  ALTER TABLE day_columns DROP CONSTRAINT day_columns_day_id_fkey;
  ALTER TABLE day_columns ADD CONSTRAINT day_columns_day_id_fkey
    FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE;

  -- day_rows → references days
  ALTER TABLE day_rows DROP CONSTRAINT day_rows_day_id_fkey;
  ALTER TABLE day_rows ADD CONSTRAINT day_rows_day_id_fkey
    FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE;

  -- weeks → references blocks
  ALTER TABLE weeks DROP CONSTRAINT weeks_block_id_fkey;
  ALTER TABLE weeks ADD CONSTRAINT weeks_block_id_fkey
    FOREIGN KEY (block_id) REFERENCES blocks(id) ON DELETE CASCADE;

  -- blocks → references programs
  ALTER TABLE blocks DROP CONSTRAINT blocks_program_id_fkey;
  ALTER TABLE blocks ADD CONSTRAINT blocks_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

  -- stats_settings → references programs
  ALTER TABLE stats_settings DROP CONSTRAINT stats_settings_program_id_fkey;
  ALTER TABLE stats_settings ADD CONSTRAINT stats_settings_program_id_fkey
    FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;
