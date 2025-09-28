import { supabase } from './supabase';
import { User, Class, Assignment, Submission } from '../types';

export const createUser = async (userData: {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  school_id?: string;
}) => {
  const { data, error } = await supabase.auth.admin.createUser({
    email: userData.email,
    password: userData.password,
    user_metadata: {
      name: userData.name,
      role: userData.role,
      school_id: userData.school_id,
    },
  });

  if (error) throw error;

  // Insert into app_users table
  const { error: dbError } = await supabase
    .from('app_users')
    .insert({
      id: data.user.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      school_id: userData.school_id,
    });

  if (dbError) throw dbError;
  return data;
};

export const getUsers = async () => {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const getClasses = async () => {
  const { data, error } = await supabase
    .from('classes')
    .select(`
      *,
      teacher:app_users!teacher_id(name),
      school:schools(name)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createClass = async (classData: {
  name: string;
  description?: string;
  school_id: string;
  teacher_id: string;
}) => {
  const { data, error } = await supabase
    .from('classes')
    .insert(classData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getAssignments = async (classId?: string) => {
  let query = supabase
    .from('assignments')
    .select(`
      *,
      class:classes(name),
      teacher:app_users!teacher_id(name)
    `)
    .order('created_at', { ascending: false });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const createAssignment = async (assignmentData: {
  title: string;
  description?: string;
  class_id: string;
  teacher_id: string;
  due_date?: string;
  max_score?: number;
  allow_multiple_submissions?: boolean;
}) => {
  const { data, error } = await supabase
    .from('assignments')
    .insert(assignmentData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getSubmissions = async (assignmentId?: string) => {
  let query = supabase
    .from('submissions')
    .select(`
      *,
      assignment:assignments(title),
      student:app_users!student_id(name, email)
    `)
    .order('submitted_at', { ascending: false });

  if (assignmentId) {
    query = query.eq('assignment_id', assignmentId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const submitAssignment = async (submissionData: {
  assignment_id: string;
  student_id: string;
  file_path: string;
  file_size: number;
}) => {
  const { data, error } = await supabase
    .from('submissions')
    .insert(submissionData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getSchools = async () => {
  const { data, error } = await supabase
    .from('schools')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const createLesson = async (lessonData: {
  title: string;
  description?: string;
  class_id: string;
  teacher_id: string;
  video_path?: string;
  category?: string;
  scheduled_at?: string;
}) => {
  const { data, error } = await supabase
    .from('lessons')
    .insert(lessonData)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getLessons = async (classId?: string) => {
  let query = supabase
    .from('lessons')
    .select(`
      *,
      class:classes(name),
      teacher:app_users!teacher_id(name)
    `)
    .order('created_at', { ascending: false });

  if (classId) {
    query = query.eq('class_id', classId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const deleteLesson = async (lessonId: string) => {
  const { error } = await supabase
    .from('lessons')
    .delete()
    .eq('id', lessonId);

  if (error) throw error;
};

export const gradeSubmission = async (submissionId: string, grade: number, feedback?: string) => {
  const { data, error } = await supabase
    .from('submissions')
    .update({ 
      grade, 
      feedback, 
      status: 'graded' 
    })
    .eq('id', submissionId)
    .select()
    .single();

  if (error) throw error;
  return data;
};