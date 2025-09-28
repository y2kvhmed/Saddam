Physics — Expo + Supabase Context File

Short name / product: Physics — with Mr. Saddam

Platform: Expo (React Native) app + Expo web (single codebase). Backend: Supabase (Postgres, Auth, Storage, Edge Functions / RPC).

1. High-level overview

A Google‑Classroom–style app tailored for a single-course deployment ("Physics, with Mr. Saddam") but built to support multiple schools & multiple classes. The app is Expo-managed and uses Supabase for auth, DB, storage, realtime and server functions.

Primary actors:

Admin — full control. Creates administrators, teachers, students (no public signup). Creates schools and classes. Manages accounts, classes, and global settings.

Teacher — creates assignments, schedules online classes, uploads lesson recordings, views submissions, grades and gives feedback.

Student — logs in (admin-created account), views assignments and deadlines, submits PDF assignments, views lesson recordings and schedule.

Important constraints from the brief:

No public signup — admin creates accounts only.

Only PDFs accepted for assignment submissions.

Default admin credentials: mrsaddamkhatir@gmail.com / MasterClassAcademy (must be changed on first login; enforce).

Accent color #001F3F. Background default white; app supports dark mode (black background) as a choice.

iOS-like visual language (curved corners, soft shadows, SF Pro / rounded fonts where licensed).

2. Goals & non‑goals

Goals

Minimal, polished experience for teacher + students for one class (but support multiple classes per school).

Complete feature parity with classroom essentials: assignments, grading, schedules, recordings, messages/announcements, calendar, file storage, audit logs.

Strong security: RLS, storage rules, least‑privilege service keys.

3. Tech stack & architecture

Frontend

Expo (React Native), TypeScript

Navigation: expo router (stack + bottom tabs)

UI primitives: custom iOS-themed component library + Tailwind-like utility (optional). Use react-native-safe-area-context and react-native-gesture-handler.

Backend

Supabase (Postgres + Auth + Storage + Realtime)

Edge Functions (for privileged operations, e.g. user creation, signed upload generation, virus scan trigger)

Video storage + playback: Supabase Storage + streaming through signed URLs or a CDN.

Implementation detail: the users table includes a role enum (admin, teacher, student) and a school_id.

5. Data model (recommended SQL schema)

Below are the core tables. Use UUIDs (uuid_generate_v4()) for PKs.

-- extension
create extension if not exists "uuid-ossp";


-- users (links to auth.users via id)
create table app_users (
  id uuid primary key default uuid_generate_v4(), -- mirrors auth.users.id for convenience
  email text not null unique,
  name text,
  phone text,
  role text not null check (role in ('admin','teacher','student')),
  school_id uuid references schools(id) on delete set null,
  created_at timestamptz default now()
);


create table schools (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_at timestamptz default now()
);


create table classes (
  id uuid primary key default uuid_generate_v4(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  description text,
  teacher_id uuid references app_users(id) on delete set null,
  created_at timestamptz default now()
);


create table enrollments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  student_id uuid references app_users(id) on delete cascade,
  joined_at timestamptz default now(),
  active boolean default true
);


create table assignments (
  id uuid primary key default uuid_generate_v4(),
  class_id uuid references classes(id) on delete cascade,
  teacher_id uuid references app_users(id) on delete set null,
  title text not null,
  description text,
  created_at timestamptz default now(),
  due_date timestamptz,
  max_score int,
  allow_multiple_submissions boolean default false
);


create table submissions (
  id uuid primary key default uuid_generate_v4(),
  assignment_id uuid references assignments(id) on delete cascade,
  student_id uuid references app_users(id) on delete cascade,
  file_path text not null, -- path inside storage bucket
  file_size bigint,
  submitted_at timestamptz default now(),
  grade int,
  feedback text,
  status text default 'submitted' check (status in ('submitted','late','resubmitted','graded'))
);


create table lessons (

Add indexes on assignments.class_id, submissions.assignment_id, enrollments.class_id, enrollments.student_id.

6. Supabase Auth & Admin account creation

Design choices

Use Supabase Auth for primary authentication. Each app user has an auth.users entry + a mirrored app_users row with role and metadata.

Admin-only creation: a server-side function (Edge Function) or migration script uses the Supabase service_role key to call the Admin endpoint and create user accounts. The admin UI calls an Edge Function (authenticated as admin) which performs the creation through the service role key — this prevents exposing service role key in client.

Example (Node / edge function) to create a user

// run server-side (Edge function) - uses SUPABASE_SERVICE_ROLE_KEY
import fetch from 'node-fetch';


export async function createUser({ email, password, role, name, school_id }){
  const res = await fetch(`${process.env.SUPABASE_URL}/auth/v1/admin/users`,{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
    },
    body: JSON.stringify({ email, password, user_metadata: { role, name, school_id } })
  });
  const body = await res.json();
  // then insert into public.app_users (server-side) to mirror metadata
  // use Supabase Postgres client with service role key or SQL RPC
  return body;
}

Default admin setup (seed)

Create initial admin user using a migration / seed script that uses service_role key and then inserts corresponding app_users row. Make this part of first-deploy migration.

Important: do not hardcode MasterClassAcademy in code. Seed only via secure pipeline and enforce change-on-first-login.

7. RLS (Row Level Security) and storage rules (recommended)

General principle: enable RLS on all public tables and write explicit policies.

Examples

-- Enable RLS
alter table assignments enable row level security;


-- Teachers (users.role='teacher') can insert assignments
create policy "teachers_insert_assignments" on assignments
  for insert
  to authenticated
  using (exists (select 1 from app_users u where u.id = auth.uid() and u.role = 'teacher'));


-- Students can select assignments only for classes they're enrolled in
create policy "students_select_assignments" on assignments
  for select
  to authenticated
  using (
    exists (
      select 1 from enrollments e
      where e.class_id = assignments.class_id
        and e.student_id = auth.uid()
    )
  );


-- Teachers can select assignments for their classes
create policy "teachers_select_own_classes" on assignments
  for select
  to authenticated
  using (
    exists (select 1 from app_users u where u.id = auth.uid() and u.role = 'teacher' and (assignments.teacher_id = auth.uid()))
  );

Storage (buckets)

Buckets: submissions, recordings, assets.

Policy: bucket is private. Use signed URLs for downloads. For uploads, generate a short-lived signed upload URL server-side (Edge Function) after validating user role and assignment context. Alternatively: accept uploads via the Edge Function and server-side upload using service_role key.

Enforce file type and size both client-side and server-side. Use a server-side step to check the first bytes of uploaded file (PDF magic bytes %PDF-).

8. File upload rules & storage layout

Bucket names & path structure

submissions bucket

path: submissions/{school_id}/{class_id}/{assignment_id}/{student_id}.pdf

recordings bucket

path: recordings/{school_id}/{class_id}/{lesson_id}/{recording_id}.mp4

Constraints

Only accept application/pdf.

Max file size: configurable (suggest 10 MB for initial rollout).

Validate magic bytes server-side before accepting or copying to final bucket.

Keep a file_size and file_path in submissions table for audit.

Upload flow (recommended secure flow)

Client validates file type & size.

Client requests an upload token from Edge Function: POST /edge/get_upload_url with {assignment_id}. Edge function checks user role/enrollment and returns a signed upload URL + expected path.

Client uploads file directly to signed URL.

Edge Function polls/




make it that i can access the admin as a test admin and i got all the power if i in the login wrote "Admin" in the email area and password is "Adm1n1strat0r"