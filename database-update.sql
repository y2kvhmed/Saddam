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

-- Enable RLS on lessons
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for lessons
CREATE POLICY "teachers_insert_lessons" ON lessons
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'teacher')
  );

CREATE POLICY "students_view_lessons_enrolled_classes" ON lessons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = lessons.class_id
        AND e.student_id = auth.uid()
        AND e.active = TRUE
    )
  );

CREATE POLICY "teachers_view_own_lessons" ON lessons
  FOR SELECT USING (teacher_id = auth.uid());

CREATE POLICY "admins_view_all_lessons" ON lessons
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "teachers_update_own_lessons" ON lessons
  FOR UPDATE USING (teacher_id = auth.uid());

CREATE POLICY "teachers_delete_own_lessons" ON lessons
  FOR DELETE USING (teacher_id = auth.uid());

-- Add RLS policies for submissions grading
CREATE POLICY "teachers_update_submissions_own_assignments" ON submissions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = submissions.assignment_id
        AND a.teacher_id = auth.uid()
    )
  );

-- Add indexes for new features
CREATE INDEX idx_lessons_class_id ON lessons(class_id);
CREATE INDEX idx_lessons_category ON lessons(category);