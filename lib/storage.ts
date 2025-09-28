import { supabase } from './supabase';
import * as FileSystem from 'expo-file-system';

export const uploadVideo = async (
  uri: string,
  fileName: string,
  classId: string,
  lessonId: string
) => {
  try {
    // Read file as base64
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to blob
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'video/mp4' });

    const filePath = `recordings/${classId}/${lessonId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('recordings')
      .upload(filePath, blob);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading video:', error);
    throw error;
  }
};

export const uploadPDF = async (
  uri: string,
  fileName: string,
  assignmentId: string,
  studentId: string
) => {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    const filePath = `submissions/${assignmentId}/${studentId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('submissions')
      .upload(filePath, blob);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error uploading PDF:', error);
    throw error;
  }
};

export const getSignedUrl = async (bucket: string, path: string) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, 3600); // 1 hour expiry

  if (error) throw error;
  return data.signedUrl;
};

export const deleteFile = async (bucket: string, path: string) => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) throw error;
};