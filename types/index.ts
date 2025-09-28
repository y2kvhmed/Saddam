export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: 'admin' | 'teacher' | 'student';
  school_id?: string;
  created_at: string;
}

export interface School {
  id: string;
  name: string;
  created_at: string;
}

export interface Class {
  id: string;
  school_id: string;
  name: string;
  description?: string;
  teacher_id?: string;
  created_at: string;
}

export interface Assignment {
  id: string;
  class_id: string;
  teacher_id?: string;
  title: string;
  description?: string;
  created_at: string;
  due_date?: string;
  max_score?: number;
  allow_multiple_submissions: boolean;
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  file_path: string;
  file_size?: number;
  submitted_at: string;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'late' | 'resubmitted' | 'graded';
}