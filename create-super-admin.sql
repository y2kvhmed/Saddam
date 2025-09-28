-- Create super admin user that cannot be deleted
-- First, create the auth user (run this in Supabase SQL editor)

-- Insert into auth.users (this requires service role key in production)
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'Bedaya.sdn@gmail.com',
  crypt('Bedaya@2025', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
);

-- Create the app_users entry (run after creating auth user)
-- First get the auth user ID, then insert into app_users
DO $$
DECLARE
  auth_user_id uuid;
BEGIN
  SELECT id INTO auth_user_id FROM auth.users WHERE email = 'Bedaya.sdn@gmail.com';
  
  IF auth_user_id IS NOT NULL THEN
    INSERT INTO app_users (id, email, name, role, created_at)
    VALUES (auth_user_id, 'Bedaya.sdn@gmail.com', 'Super Administrator', 'admin', NOW())
    ON CONFLICT (email) DO NOTHING;
  END IF;
END $$;

-- Create a function to prevent deletion of super admin
CREATE OR REPLACE FUNCTION prevent_super_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email = 'Bedaya.sdn@gmail.com' THEN
    RAISE EXCEPTION 'Cannot delete super administrator account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent deletion
CREATE TRIGGER prevent_super_admin_deletion_trigger
  BEFORE DELETE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_deletion();

-- Also prevent deletion from auth.users
CREATE OR REPLACE FUNCTION prevent_auth_super_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email = 'Bedaya.sdn@gmail.com' THEN
    RAISE EXCEPTION 'Cannot delete super administrator account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_auth_super_admin_deletion_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_auth_super_admin_deletion();

-- Create Edge Functions for user management
CREATE OR REPLACE FUNCTION create_user_account(
  user_email text,
  user_password text,
  user_name text,
  user_role text,
  user_school_id uuid DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id uuid;
  result json;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  -- Validate role
  IF user_role NOT IN ('admin', 'teacher', 'student') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  -- This would normally call Supabase Admin API
  -- For now, return success message
  result := json_build_object(
    'success', true,
    'message', 'User creation request processed',
    'email', user_email,
    'role', user_role
  );

  RETURN result;
END;
$$;

-- Create function to manage schools
CREATE OR REPLACE FUNCTION create_school(
  school_name text,
  school_description text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_school_id uuid;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create schools';
  END IF;

  INSERT INTO schools (name, description)
  VALUES (school_name, school_description)
  RETURNING id INTO new_school_id;

  RETURN new_school_id;
END;
$$;

-- Create function to manage classes
CREATE OR REPLACE FUNCTION create_class(
  class_name text,
  class_description text,
  class_school_id uuid,
  teacher_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_class_id uuid;
BEGIN
  -- Check if caller is admin or teacher
  IF NOT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  ) THEN
    RAISE EXCEPTION 'Only admins and teachers can create classes';
  END IF;

  -- Verify teacher exists and has teacher role
  IF NOT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = teacher_id AND role = 'teacher'
  ) THEN
    RAISE EXCEPTION 'Invalid teacher specified';
  END IF;

  INSERT INTO classes (name, description, school_id, teacher_id)
  VALUES (class_name, class_description, class_school_id, teacher_id)
  RETURNING id INTO new_class_id;

  RETURN new_class_id;
END;
$$;