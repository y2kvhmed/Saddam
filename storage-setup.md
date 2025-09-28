# Storage Buckets Setup

## Manual Setup Required in Supabase Dashboard

Go to your Supabase project → Storage → Create the following buckets:

### 1. Create Buckets

**Bucket Name: `submissions`**
- Public: No (Private)
- File size limit: 10MB
- Allowed MIME types: application/pdf

**Bucket Name: `recordings`** 
- Public: No (Private)
- File size limit: 500MB
- Allowed MIME types: video/mp4, video/quicktime

**Bucket Name: `assets`**
- Public: Yes (for app assets)
- File size limit: 50MB
- Allowed MIME types: image/*, application/pdf

### 2. Storage Policies (Run in SQL Editor)

```sql
-- Submissions bucket policies
CREATE POLICY "Students can upload own submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'submissions' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[4] = auth.uid()::text
  );

CREATE POLICY "Students can view own submissions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[4] = auth.uid()::text
  );

CREATE POLICY "Teachers can view class submissions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN classes c ON c.id = a.class_id
      WHERE c.teacher_id = auth.uid()
      AND (storage.foldername(name))[3] = a.id::text
    )
  );

CREATE POLICY "Admins full access submissions" ON storage.objects
  FOR ALL USING (
    bucket_id = 'submissions' AND
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );

-- Recordings bucket policies
CREATE POLICY "Teachers can upload recordings" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'recordings' AND
    auth.role() = 'authenticated' AND
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role IN ('teacher', 'admin'))
  );

CREATE POLICY "Students can view class recordings" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'recordings' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM enrollments e
      JOIN classes c ON c.id = e.class_id
      WHERE e.student_id = auth.uid()
      AND e.active = TRUE
      AND (storage.foldername(name))[2] = c.id::text
    )
  );

CREATE POLICY "Teachers can manage own recordings" ON storage.objects
  FOR ALL USING (
    bucket_id = 'recordings' AND
    auth.role() = 'authenticated' AND
    EXISTS (
      SELECT 1 FROM classes c
      WHERE c.teacher_id = auth.uid()
      AND (storage.foldername(name))[2] = c.id::text
    )
  );

-- Assets bucket policies (public)
CREATE POLICY "Public assets read" ON storage.objects
  FOR SELECT USING (bucket_id = 'assets');

CREATE POLICY "Admins can manage assets" ON storage.objects
  FOR ALL USING (
    bucket_id = 'assets' AND
    EXISTS (SELECT 1 FROM app_users WHERE id = auth.uid() AND role = 'admin')
  );
```

### 3. File Path Structure

**Submissions:**
`submissions/{school_id}/{class_id}/{assignment_id}/{student_id}_{timestamp}.pdf`

**Recordings:**
`recordings/{school_id}/{class_id}/{lesson_id}/{recording_id}.mp4`

**Assets:**
`assets/{type}/{filename}`

### 4. Alternative: Create via API

If you prefer to create buckets programmatically, use this JavaScript code in your Supabase project:

```javascript
// Run this in Supabase Edge Functions or your backend
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createBuckets() {
  // Create submissions bucket
  await supabase.storage.createBucket('submissions', {
    public: false,
    fileSizeLimit: 10485760, // 10MB
    allowedMimeTypes: ['application/pdf']
  })

  // Create recordings bucket  
  await supabase.storage.createBucket('recordings', {
    public: false,
    fileSizeLimit: 524288000, // 500MB
    allowedMimeTypes: ['video/mp4', 'video/quicktime']
  })

  // Create assets bucket
  await supabase.storage.createBucket('assets', {
    public: true,
    fileSizeLimit: 52428800, // 50MB
    allowedMimeTypes: ['image/*', 'application/pdf']
  })
}
```

## Important Notes:

1. **Manual Creation Required**: Storage buckets cannot be created via SQL - must be done in dashboard or via API
2. **Policies**: Run the storage policies SQL after creating buckets
3. **File Validation**: The app validates file types and sizes client-side, but server-side validation is also enforced
4. **Security**: All buckets are private except assets, with RLS policies controlling access