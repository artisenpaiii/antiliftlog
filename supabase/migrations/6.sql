CREATE TABLE stats_settings (
   id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
   program_id uuid REFERENCES programs(id) ON DELETE CASCADE UNIQUE,
   created_by uuid NOT NULL,
   exercise_label text NOT NULL,
   sets_label text NOT NULL,
   reps_label text NOT NULL,
   weight_label text NOT NULL,
   created_at timestamptz DEFAULT now(),
   updated_at timestamptz DEFAULT now()
 );

 ALTER TABLE stats_settings ENABLE ROW LEVEL SECURITY;

 CREATE POLICY "Users can manage their own stats_settings"
   ON stats_settings FOR ALL
   USING (created_by = auth.uid());