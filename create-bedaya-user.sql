-- Create Bedaya admin user in app_users table
-- This assumes the Supabase auth user already exists

-- First, get the auth user ID (replace with actual ID from Supabase Auth)
-- You can find this in Supabase Dashboard > Authentication > Users

-- Link existing Bedaya auth user to app_users table
-- This will automatically use the auth user ID
INSERT INTO app_users (
  id,
  email,
  name,
  role,
  created_at,
  is_active
) 
SELECT 
  au.id,
  'Bedaya.sdn@gmail.com',
  'Bedaya Administrator',
  'admin',
  NOW(),
  TRUE
FROM auth.users au 
WHERE au.email = 'Bedaya.sdn@gmail.com'
ON CONFLICT (email) DO UPDATE SET
  id = (SELECT id FROM auth.users WHERE email = 'Bedaya.sdn@gmail.com' LIMIT 1),
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- If no auth user exists, create placeholder (will need manual auth user creation)
INSERT INTO app_users (
  email,
  name,
  role,
  created_at,
  is_active
) VALUES (
  'Bedaya.sdn@gmail.com',
  'Bedaya Administrator',
  'admin',
  NOW(),
  TRUE
) ON CONFLICT (email) DO NOTHING;