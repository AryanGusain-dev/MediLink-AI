-- Migration 006: AI Analysis Results
-- Run after 002_documents.sql

-- Extend the documents table with AI processing fields
ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text    TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_processed      BOOLEAN DEFAULT FALSE;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS ai_processed_at   TIMESTAMPTZ;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS processing_error  TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS generated_title   TEXT;
ALTER TABLE documents ADD COLUMN IF NOT EXISTS document_category TEXT;

-- Extend profiles with AI-generated health summary
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ai_health_summary JSONB;

-- Full structured AI analysis output per document
CREATE TABLE IF NOT EXISTS ai_analysis_results (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id        UUID REFERENCES documents(id) ON DELETE CASCADE,
  profile_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  patient_info       JSONB,
  doctor_info        JSONB,
  hospital_info      JSONB,
  conditions         JSONB DEFAULT '[]'::jsonb,
  medications        JSONB DEFAULT '[]'::jsonb,
  lab_results        JSONB DEFAULT '[]'::jsonb,
  timeline_events    JSONB DEFAULT '[]'::jsonb,
  important_findings JSONB DEFAULT '[]'::jsonb,
  summary            TEXT,
  raw_llm_output     JSONB,
  model_used         TEXT,
  tokens_used        INT,
  created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_analysis_document ON ai_analysis_results(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_analysis_profile  ON ai_analysis_results(profile_id);
