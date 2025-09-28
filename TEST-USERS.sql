-- Create test users for student and teacher
-- Run this in Supabase SQL Editor

INSERT INTO app_users (email, name, role) VALUES 
('student@test.com', 'Test Student', 'student'),
('teacher@test.com', 'Test Teacher', 'teacher')
ON CONFLICT (email) DO NOTHING;

SELECT 'Test users created! Login with student@test.com or teacher@test.com (any password)' as status;