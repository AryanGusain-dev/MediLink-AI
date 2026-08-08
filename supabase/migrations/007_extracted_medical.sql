-- Migration 007: Extracted Medical Values
-- Run after 006_ai_analysis.sql

-- Flat individual lab/medication/diagnosis rows for fast querying and timeline views
CREATE TABLE IF NOT EXISTS extracted_medical_values (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID REFERENCES documents(id) ON DELETE CASCADE,
  profile_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  value_type      TEXT NOT NULL CHECK (value_type IN ('lab_result', 'medication', 'diagnosis', 'vital')),
  name            TEXT NOT NULL,
  value           TEXT,
  unit            TEXT,
  reference_range TEXT,
  is_abnormal     BOOLEAN DEFAULT FALSE,
  recorded_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_med_values_profile      ON extracted_medical_values(profile_id);
CREATE INDEX IF NOT EXISTS idx_med_values_document     ON extracted_medical_values(document_id);
CREATE INDEX IF NOT EXISTS idx_med_values_type         ON extracted_medical_values(value_type);
CREATE INDEX IF NOT EXISTS idx_med_values_is_abnormal  ON extracted_medical_values(is_abnormal) WHERE is_abnormal = TRUE;
