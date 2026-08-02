CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  dob DATE,
  gender TEXT,
  blood_group TEXT,
  height_cm NUMERIC,
  weight_kg NUMERIC,
  address TEXT,
  health_summary TEXT,
  subscription_plan TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT,
  phone TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE
);
