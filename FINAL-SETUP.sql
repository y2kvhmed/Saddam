-- FINAL COMPLETE DATABASE SETUP
-- Run this file in Supabase SQL Editor to set up everything

-- 1. Create storage buckets first
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('submissions', 'submissions', false, 10485760, ARRAY['application/pdf']),
  ('recordings', 'recordings', false, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('assets', 'assets', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- 2. Run the complete production schema
-- (Copy and paste the entire production-schema.sql content here)

-- 3. Create Bedaya admin user if auth user exists
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

-- 4. Create placeholder if no auth user exists
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

-- 5. Apply storage policies
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
      (storage.foldername(name))[4] = auth.uid()::text OR
      EXISTS (
        SELECT 1 FROM assignments a
        JOIN classes c ON c.id = a.class_id
        WHERE c.teacher_id = auth.uid()
        AND (storage.foldername(name))[3] = a.id::text
      ) OR
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
      EXISTS (
        SELECT 1 FROM enrollments e
        JOIN classes c ON c.id = e.class_id
        WHERE e.student_id = auth.uid()
        AND e.active = TRUE
        AND (storage.foldername(name))[2] = c.id::text
      ) OR
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

-- 6. Test data (optional - remove in production)
-- Create a test school
INSERT INTO schools (name, description) 
VALUES ('Test Physics Academy', 'A test school for physics education')
ON CONFLICT DO NOTHING;

-- Success message
SELECT 'Database setup completed successfully!' as status;