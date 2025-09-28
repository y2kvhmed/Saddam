-- Enhanced RLS policies for better security

-- Prevent unauthorized access to sensitive data
CREATE POLICY "prevent_user_enumeration" ON app_users
  FOR SELECT USING (
    auth.uid() = id OR 
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- Restrict assignment access to enrolled students only
CREATE POLICY "students_assignments_enrolled_only" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = assignments.class_id
        AND e.student_id = auth.uid()
        AND e.active = TRUE
    ) OR
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('admin', 'teacher'))
  );

-- Prevent students from accessing other students' submissions
CREATE POLICY "submissions_privacy" ON submissions
  FOR SELECT USING (
    student_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM assignments a
      WHERE a.id = submissions.assignment_id
        AND a.teacher_id = auth.uid()
    ) OR
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Audit log access restrictions
CREATE POLICY "audit_logs_admin_only" ON audit_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Storage bucket policies (run in Supabase dashboard)
-- Submissions bucket - students can only upload, teachers/admins can view
-- CREATE POLICY "submissions_upload_own_only" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'submissions' AND
--     auth.role() = 'authenticated' AND
--     (storage.foldername(name))[3] = auth.uid()::text
--   );

-- CREATE POLICY "submissions_view_authorized" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'submissions' AND
--     auth.role() = 'authenticated' AND
--     (
--       (storage.foldername(name))[3] = auth.uid()::text OR
--       EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
--     )
--   );

-- Recordings bucket - teachers can upload, all authenticated users can view
-- CREATE POLICY "recordings_teacher_upload" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'recordings' AND
--     auth.role() = 'authenticated' AND
--     EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'teacher')
--   );

-- CREATE POLICY "recordings_authenticated_view" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'recordings' AND
--     auth.role() = 'authenticated'
--   );

-- Function to check user permissions
CREATE OR REPLACE FUNCTION check_user_permission(required_role text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM app_users 
    WHERE id = auth.uid() 
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
  event_action text,
  event_details jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO audit_logs (user_id, action, resource_type, details)
  VALUES (auth.uid(), event_action, 'security', event_details);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for failed login attempts
CREATE OR REPLACE FUNCTION handle_auth_failure()
RETURNS trigger AS $$
BEGIN
  -- Log failed authentication attempts
  PERFORM log_security_event('auth_failure', jsonb_build_object(
    'timestamp', NOW(),
    'ip_address', current_setting('request.headers', true)::jsonb->>'x-forwarded-for'
  ));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable real-time subscriptions with security
ALTER PUBLICATION supabase_realtime ADD TABLE assignments;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE lessons;

-- Row-level security for real-time
CREATE POLICY "realtime_assignments" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enrollments e
      WHERE e.class_id = assignments.class_id
        AND e.student_id = auth.uid()
        AND e.active = TRUE
    ) OR
    teacher_id = auth.uid() OR
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Prevent SQL injection with parameterized queries
CREATE OR REPLACE FUNCTION safe_user_search(search_term text)
RETURNS TABLE(id uuid, name text, email text, role text) AS $$
BEGIN
  RETURN QUERY
  SELECT u.id, u.name, u.email, u.role
  FROM app_users u
  WHERE u.name ILIKE '%' || search_term || '%'
    AND EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  LIMIT 50;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;