-- Storage Buckets and Policies
-- Creates buckets and applies security policies

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('submissions', 'submissions', false, 10485760, ARRAY['application/pdf']),
  ('recordings', 'recordings', false, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('assets', 'assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Submissions bucket policies
CREATE POLICY "Students upload own submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'submissions' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Students view own submissions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' AND
    auth.role() = 'authenticated' AND
    (
      -- Student can view their own files
      (storage.foldername(name))[4] = auth.uid()::text OR
      -- Teachers can view submissions for their assignments
      EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON c.id = a.class_id
        WHERE c.teacher_id = auth.uid()
        AND (storage.foldername(name))[3] = a.id::text
      ) OR
      -- Admins can view all
      EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Teachers view class submissions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' AND
    auth.role() = 'authenticated' AND
    (
      EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON c.id = a.class_id
        WHERE c.teacher_id = auth.uid()
        AND (storage.foldername(name))[3] = a.id::text
      ) OR
      EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Admins full access submissions" ON storage.objects
  FOR ALL USING (
    bucket_id = 'submissions' AND
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Recordings bucket policies
CREATE POLICY "Teachers upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

CREATE POLICY "View class recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND
    auth.role() = 'authenticated' AND
    (
      -- Students can view recordings for their enrolled classes
      EXISTS (
        SELECT 1 FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        WHERE e.student_id = auth.uid()
        AND e.active = TRUE
        AND (storage.foldername(name))[2] = c.id::text
      ) OR
      -- Teachers can view their own class recordings
      EXISTS (
        SELECT 1 FROM classes c
        WHERE c.teacher_id = auth.uid()
        AND (storage.foldername(name))[2] = c.id::text
      ) OR
      -- Admins can view all
      EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
    )
  );

CREATE POLICY "Teachers manage own recordings" ON storage.objects
  FOR ALL USING (
    bucket_id = 'recordings' AND
    auth.role() = 'authenticated' AND
    (
      EXISTS (
        SELECT 1 FROM classes c
        WHERE c.teacher_id = auth.uid()
        AND (storage.foldername(name))[2] = c.id::text
      ) OR
      EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
    )
  );

-- Assets bucket policies (public bucket)
CREATE POLICY "Public assets read" ON storage.objects
  FOR SELECT USING (bucket_id = 'assets');

CREATE POLICY "Admins manage assets" ON storage.objects
  FOR ALL USING (
    bucket_id = 'assets' AND
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );