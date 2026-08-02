CREATE TABLE share_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  allowed_fields JSONB DEFAULT '[]'::jsonb,
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  share_profile_id UUID REFERENCES share_profiles(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  scan_count INT DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
