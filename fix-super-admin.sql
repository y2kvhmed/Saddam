-- Fix super admin mapping
DO $$
DECLARE
  auth_user_id uuid;
BEGIN
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'Bedaya.sdn@gmail.com';
  
  IF auth_user_id IS NOT NULL THEN
    INSERT INTO app_users (id, email, name, role, created_at)
    VALUES (auth_user_id, 'Bedaya.sdn@gmail.com', 'Super Administrator', 'admin', NOW())
    ON CONFLICT (email) DO UPDATE SET id = auth_user_id;
  END IF;
END $$;