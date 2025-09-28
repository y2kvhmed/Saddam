-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create schools table
CREATE TABLE schools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create app_users table (mirrors auth.users)
CREATE TABLE app_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin','teacher','student')),
  school_id UUID REFERENCES schools(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create classes table
CREATE TABLE classes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  school_id UUID REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  teacher_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create enrollments table
CREATE TABLE enrollments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  student_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  active BOOLEAN DEFAULT TRUE,
  UNIQUE(class_id, student_id)
);

-- Create assignments table
CREATE TABLE assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  due_date TIMESTAMPTZ,
  max_score INTEGER,
  allow_multiple_submissions BOOLEAN DEFAULT FALSE
);

-- Create submissions table
CREATE TABLE submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID REFERENCES assignments(id) ON DELETE CASCADE,
  student_id UUID REFERENCES app_users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_size BIGINT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  grade INTEGER,
  feedback TEXT,
  status TEXT DEFAULT 'submitted' CHECK (status IN ('submitted','late','resubmitted','graded'))
);

-- Create lessons table
CREATE TABLE lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_path TEXT,
  category TEXT,
  scheduled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app_users
CREATE POLICY "Users can view their own profile" ON app_users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON app_users
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for assignments
CREATE POLICY "Teachers can insert assignments" ON assignments
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "Students can view assignments for enrolled classes" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = assignments.class_id
        AND e.student_id = auth.uid()
        AND e.active = TRUE
    )
  );

CREATE POLICY "Teachers can view their own assignments" ON assignments
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "Admins can view all assignments" ON assignments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- RLS Policies for submissions
CREATE POLICY "Students can insert their own submissions" ON submissions
  FOR INSERT WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students can view their own submissions" ON submissions
  FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Teachers can view submissions for their assignments" ON submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = submissions.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX idx_assignments_class_id ON assignments(class_id);
CREATE INDEX idx_submissions_assignment_id ON submissions(assignment_id);
CREATE INDEX idx_enrollments_class_id ON enrollments(class_id);
CREATE INDEX idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX idx_app_users_email ON app_users(email);
CREATE INDEX idx_app_users_role ON app_users(role);

-- Insert default school
INSERT INTO schools (name) VALUES ('Master Class Academy');

-- Insert test admin user (this should match your auth.users entry)
INSERT INTO app_users (email, name, role, school_id)
VALUES (
  'Admin',
  'Test Administrator',
  'admin',
  (SELECT id FROM schools WHERE name = 'Master Class Academy' LIMIT 1)
);

-- Insert sample class
INSERT INTO classes (name, description, school_id)
VALUES (
  'Physics - Advanced Level',
  'Advanced Physics course covering mechanics, thermodynamics, waves, and modern physics',
  (SELECT id FROM schools WHERE name = 'Master Class Academy' LIMIT 1)
);

-- Create storage buckets (run these in Supabase dashboard)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('submissions', 'submissions', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('recordings', 'recordings', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('assets', 'assets', false);

-- Storage policies (run these in Supabase dashboard)
-- CREATE POLICY "Students can upload submissions" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'submissions' AND
--     auth.role() = 'authenticated' AND
--     EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'student')
--   );

-- CREATE POLICY "Teachers can upload recordings" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'recordings' AND
--     auth.role() = 'authenticated' AND
--     EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'teacher')
--   );