-- MINIMAL FIX - Run this in Supabase SQL Editor

-- Drop and recreate tables with correct structure
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Simple tables without constraints
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL,
  school_id uuid,
  created_at timestamptz DEFAULT NOW(),
  is_active boolean DEFAULT TRUE
);

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  teacher_id uuid,
  school_id uuid,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id uuid,
  student_id uuid,
  joined_at timestamptz DEFAULT NOW()
);

-- Disable all security
ALTER TABLE schools DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments DISABLE ROW LEVEL SECURITY;

-- Insert admin
INSERT INTO app_users (email, name, role) 
VALUES ('admin@test.com', 'Admin User', 'admin');

SELECT 'Fixed! Try creating now.' as status;