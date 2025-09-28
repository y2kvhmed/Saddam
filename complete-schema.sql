-- Complete database schema from context.md
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE IF NOT EXISTS schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text,
  phone text,
  role text NOT NULL CHECK (role IN ('admin','teacher','student')),
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  teacher_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT NOW(),
  active boolean DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  created_at timestamptz DEFAULT NOW(),
  due_date timestamptz,
  max_score int,
  allow_multiple_submissions boolean DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_size bigint,
  submitted_at timestamptz DEFAULT NOW(),
  grade int,
  feedback text,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted','late','resubmitted','graded'))
);

CREATE TABLE IF NOT EXISTS lessons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  video_path text,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON assignments(class_id);
CREATE INDEX IF NOT EXISTS idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "users_select_own_or_admin" ON app_users
  FOR SELECT USING (
    id = auth.uid() OR 
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

CREATE POLICY "admin_full_access_users" ON app_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "teachers_insert_assignments" ON assignments
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM app_users u WHERE u.id = auth.uid() AND u.role = 'teacher'));

CREATE POLICY "students_select_assignments" ON assignments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = assignments.class_id
        AND e.student_id = auth.uid()
    )
  );

CREATE POLICY "teachers_select_own_assignments" ON assignments
  FOR SELECT TO authenticated
  USING (teacher_id = auth.uid());

CREATE POLICY "admin_full_access_assignments" ON assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "students_insert_own_submissions" ON submissions
  FOR INSERT TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "students_update_own_submissions" ON submissions
  FOR UPDATE TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "students_select_own_submissions" ON submissions
  FOR SELECT TO authenticated
  USING (student_id = auth.uid());

CREATE POLICY "teachers_select_class_submissions" ON submissions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = submissions.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

CREATE POLICY "admin_full_access_submissions" ON submissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Functions
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
  result json;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create users';
  END IF;

  IF user_role NOT IN ('admin', 'teacher', 'student') THEN
    RAISE EXCEPTION 'Invalid role specified';
  END IF;

  result := json_build_object(
    'success', true,
    'message', 'User creation request processed',
    'email', user_email,
    'role', user_role
  );

  RETURN result;
END;
$$;

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
  IF NOT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  ) THEN
    RAISE EXCEPTION 'Only admins and teachers can create classes';
  END IF;

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

CREATE OR REPLACE FUNCTION enroll_student(
  student_id uuid,
  class_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  enrollment_id uuid;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND role IN ('admin', 'teacher')
  ) THEN
    RAISE EXCEPTION 'Only admins and teachers can enroll students';
  END IF;

  INSERT INTO enrollments (student_id, class_id)
  VALUES (student_id, class_id)
  RETURNING id INTO enrollment_id;

  RETURN enrollment_id;
END;
$$;

-- Insert super admin
INSERT INTO app_users (
  email,
  name,
  role,
  created_at
) VALUES (
  'Bedaya.sdn@gmail.com',
  'Super Administrator',
  'admin',
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Prevent super admin deletion
CREATE OR REPLACE FUNCTION prevent_super_admin_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.email = 'Bedaya.sdn@gmail.com' THEN
    RAISE EXCEPTION 'Cannot delete super administrator account';
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_super_admin_deletion_trigger ON app_users;
CREATE TRIGGER prevent_super_admin_deletion_trigger
  BEFORE DELETE ON app_users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_super_admin_deletion();