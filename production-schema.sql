-- Complete Production Schema for Physics Learning Platform
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS submissions CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS lessons CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS app_users CASCADE;
DROP TABLE IF EXISTS schools CASCADE;

-- Core tables
CREATE TABLE schools (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT NOW()
);

CREATE TABLE app_users (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  phone text,
  role text NOT NULL CHECK (role IN ('admin','teacher','student')),
  school_id uuid REFERENCES schools(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT NOW(),
  last_login timestamptz,
  is_active boolean DEFAULT TRUE
);

CREATE TABLE classes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id uuid REFERENCES schools(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  teacher_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  class_code text UNIQUE DEFAULT substring(md5(random()::text), 1, 8),
  created_at timestamptz DEFAULT NOW(),
  is_active boolean DEFAULT TRUE
);

CREATE TABLE enrollments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  student_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT NOW(),
  active boolean DEFAULT TRUE,
  UNIQUE(class_id, student_id)
);

CREATE TABLE lessons (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  video_url text,
  video_path text,
  duration_minutes integer,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT NOW(),
  is_published boolean DEFAULT FALSE
);

CREATE TABLE assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id uuid REFERENCES app_users(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  instructions text,
  created_at timestamptz DEFAULT NOW(),
  due_date timestamptz,
  max_score integer DEFAULT 100,
  allow_multiple_submissions boolean DEFAULT FALSE,
  is_published boolean DEFAULT TRUE
);

CREATE TABLE submissions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint NOT NULL,
  submitted_at timestamptz DEFAULT NOW(),
  grade integer,
  feedback text,
  status text DEFAULT 'submitted' CHECK (status IN ('submitted','late','resubmitted','graded')),
  graded_at timestamptz,
  graded_by uuid REFERENCES app_users(id),
  UNIQUE(assignment_id, student_id)
);

CREATE TABLE messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id uuid REFERENCES classes(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES app_users(id) ON DELETE CASCADE,
  title text,
  content text NOT NULL,
  message_type text DEFAULT 'announcement' CHECK (message_type IN ('announcement', 'message')),
  created_at timestamptz DEFAULT NOW(),
  is_pinned boolean DEFAULT FALSE
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES app_users(id),
  action text NOT NULL,
  resource_type text NOT NULL,
  resource_id uuid,
  details jsonb DEFAULT '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_app_users_role ON app_users(role);
CREATE INDEX idx_app_users_school_id ON app_users(school_id);
CREATE INDEX idx_classes_teacher_id ON classes(teacher_id);
CREATE INDEX idx_classes_school_id ON classes(school_id);
CREATE INDEX idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_assignments_teacher_id ON assignments(teacher_id);
CREATE INDEX idx_assignments_due_date ON assignments(due_date);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_submissions_student_id ON submissions(student_id);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_lessons_class_id ON lessons(class_id);
CREATE INDEX idx_messages_class_id ON messages(class_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Enable RLS on all tables
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Schools
CREATE POLICY "admin_full_access_schools" ON schools FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "users_view_own_school" ON schools FOR SELECT USING (
  id IN (SELECT school_id FROM app_users WHERE id = auth.uid())
);

-- App Users
CREATE POLICY "admin_full_access_users" ON app_users FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "users_view_self" ON app_users FOR SELECT USING (id = auth.uid());

CREATE POLICY "teachers_view_students" ON app_users FOR SELECT USING (
  role = 'student' AND 
  EXISTS (
    SELECT 1 FROM app_users au 
    WHERE au.id = auth.uid() AND au.role = 'teacher'
  )
);

-- Classes
CREATE POLICY "admin_full_access_classes" ON classes FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "teachers_manage_own_classes" ON classes FOR ALL USING (
  teacher_id = auth.uid()
);

CREATE POLICY "students_view_enrolled_classes" ON classes FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.class_id = classes.id AND e.student_id = auth.uid() AND e.active = TRUE
  )
);

-- Enrollments
CREATE POLICY "admin_full_access_enrollments" ON enrollments FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "teachers_manage_class_enrollments" ON enrollments FOR ALL USING (
  EXISTS (
    SELECT 1 FROM classes c 
    WHERE c.id = enrollments.class_id AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "students_view_own_enrollments" ON enrollments FOR SELECT USING (
  student_id = auth.uid()
);

-- Assignments
CREATE POLICY "admin_full_access_assignments" ON assignments FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "teachers_manage_own_assignments" ON assignments FOR ALL USING (
  teacher_id = auth.uid()
);

CREATE POLICY "students_view_class_assignments" ON assignments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.class_id = assignments.class_id AND e.student_id = auth.uid() AND e.active = TRUE
  )
);

-- Submissions
CREATE POLICY "admin_full_access_submissions" ON submissions FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "students_manage_own_submissions" ON submissions FOR ALL USING (
  student_id = auth.uid()
);

CREATE POLICY "teachers_view_class_submissions" ON submissions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM assignments a 
    WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
  )
);

CREATE POLICY "teachers_grade_submissions" ON submissions FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM assignments a 
    WHERE a.id = submissions.assignment_id AND a.teacher_id = auth.uid()
  )
);

-- Lessons
CREATE POLICY "admin_full_access_lessons" ON lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "teachers_manage_own_lessons" ON lessons FOR ALL USING (
  teacher_id = auth.uid()
);

CREATE POLICY "students_view_class_lessons" ON lessons FOR SELECT USING (
  is_published = TRUE AND EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.class_id = lessons.class_id AND e.student_id = auth.uid() AND e.active = TRUE
  )
);

-- Messages
CREATE POLICY "admin_full_access_messages" ON messages FOR ALL USING (
  EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "teachers_manage_class_messages" ON messages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM classes c 
    WHERE c.id = messages.class_id AND c.teacher_id = auth.uid()
  )
);

CREATE POLICY "students_view_class_messages" ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM enrollments e 
    WHERE e.class_id = messages.class_id AND e.student_id = auth.uid() AND e.active = TRUE
  )
);

-- Audit Logs
CREATE POLICY "admin_view_audit_logs" ON audit_logs FOR SELECT USING (
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

  -- Log the action
  INSERT INTO audit_logs (user_id, action, resource_type, details)
  VALUES (auth.uid(), 'create_user', 'user', jsonb_build_object(
    'email', user_email,
    'role', user_role,
    'name', user_name
  ));

  result := jsonb_build_object(
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

  -- Log the action
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), 'create_school', 'school', new_school_id, jsonb_build_object(
    'name', school_name
  ));

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

  -- Log the action
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), 'create_class', 'class', new_class_id, jsonb_build_object(
    'name', class_name,
    'teacher_id', teacher_id
  ));

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
  -- Check if caller is admin or teacher of the class
  IF NOT EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() AND role = 'admin'
  ) AND NOT EXISTS (
    SELECT 1 FROM classes c
    WHERE c.id = class_id AND c.teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only admins and class teachers can enroll students';
  END IF;

  INSERT INTO enrollments (student_id, class_id)
  VALUES (student_id, class_id)
  ON CONFLICT (class_id, student_id) DO UPDATE SET active = TRUE
  RETURNING id INTO enrollment_id;

  -- Log the action
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), 'enroll_student', 'enrollment', enrollment_id, jsonb_build_object(
    'student_id', student_id,
    'class_id', class_id
  ));

  RETURN enrollment_id;
END;
$$;

-- Function to log user actions
CREATE OR REPLACE FUNCTION log_user_action(
  action_name text,
  resource_type text,
  resource_id uuid DEFAULT NULL,
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
  VALUES (auth.uid(), action_name, resource_type, resource_id, details);
END;
$$;

-- Insert super admin (will be updated with proper auth user ID)
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

-- Update last login trigger
CREATE OR REPLACE FUNCTION update_last_login()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE app_users SET last_login = NOW() WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Storage bucket setup (run these in Supabase dashboard)
-- CREATE BUCKET submissions;
-- CREATE BUCKET recordings;
-- CREATE BUCKET assets;