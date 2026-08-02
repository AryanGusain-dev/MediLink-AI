CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  status TEXT DEFAULT 'uploaded',
  uploaded_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_profile ON documents(profile_id);
