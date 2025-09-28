-- Simple fix for login - create user in Supabase Auth first, then run this
-- This will link the auth user to app_users table

-- Update the app_users entry to match the auth user ID
UPDATE app_users 
SET id = (SELECT id FROM auth.users WHERE email = 'Bedaya.sdn@gmail.com')
WHERE email = 'Bedaya.sdn@gmail.com';

-- If no app_users entry exists, create one
INSERT INTO app_users (
  id,
  email,
  name,
  role,
  created_at
) 
SELECT 
  au.id,
  'Bedaya.sdn@gmail.com',
  'Super Administrator',
  'admin',
  NOW()
FROM auth.users au 
WHERE au.email = 'Bedaya.sdn@gmail.com'
AND NOT EXISTS (SELECT 1 FROM app_users WHERE email = 'Bedaya.sdn@gmail.com');