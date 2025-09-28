import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { Button } from '../components/Button';

export default function SubmitAssignment() {
  const router = useRouter();
  const { assignmentId } = useLocalSearchParams();
  const [user, setUser] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [existingSubmission, setExistingSubmission] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadUser();
    loadAssignment();
    loadExistingSubmission();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const loadAssignment = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          classes(name, school_id)
        `)
        .eq('id', assignmentId)
        .single();

      if (error) throw error;
      setAssignment(data);
    } catch (error) {
      console.error('Error loading assignment:', error);
      Alert.alert('Error', 'Failed to load assignment');
    }
  };

  const loadExistingSubmission = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', assignmentId)
        .eq('student_id', currentUser.id)
        .single();

      if (data) {
        setExistingSubmission(data);
      }
    } catch (error) {
      // No existing submission found, which is fine
      console.log('No existing submission found');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        // Validate file size (10MB limit)
        if (file.size > 10 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select a PDF file smaller than 10MB');
          return;
        }

        // Validate file type
        if (file.mimeType !== 'application/pdf') {
          Alert.alert('Invalid File Type', 'Please select a PDF file only');
          return;
        }

        setSelectedFile(file);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const uploadFile = async (file) => {
    try {
      // Read file as base64
      const fileContent = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create file path following the structure from context.md
      const fileName = `${user.id}_${Date.now()}.pdf`;
      const filePath = `submissions/${assignment.classes.school_id}/${assignment.class_id}/${assignmentId}/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('submissions')
        .upload(filePath, decode(fileContent), {
          contentType: 'application/pdf',
          upsert: false
        });

      if (error) throw error;
      return { path: data.path, fileName: file.name, fileSize: file.size };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  const decode = (base64) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const submitAssignment = async () => {
    if (!selectedFile) {
      Alert.alert('No File Selected', 'Please select a PDF file to submit');
      return;
    }

    setUploading(true);
    try {
      // Upload file
      const uploadResult = await uploadFile(selectedFile);

      // Check if this is a resubmission
      if (existingSubmission && !assignment.allow_multiple_submissions) {
        Alert.alert('Error', 'Multiple submissions are not allowed for this assignment');
        return;
      }

      // Determine submission status
      const now = new Date();
      const dueDate = new Date(assignment.due_date);
      const status = now > dueDate ? 'late' : 'submitted';

      // Create or update submission
      const submissionData = {
        assignment_id: assignmentId,
        student_id: user.id,
        file_path: uploadResult.path,
        file_name: uploadResult.fileName,
        file_size: uploadResult.fileSize,
        status: existingSubmission ? 'resubmitted' : status,
        submitted_at: new Date().toISOString()
      };

      let result;
      if (existingSubmission) {
        // Update existing submission
        result = await supabase
          .from('submissions')
          .update(submissionData)
          .eq('id', existingSubmission.id)
          .select()
          .single();
      } else {
        // Create new submission
        result = await supabase
          .from('submissions')
          .insert(submissionData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      // Log the action
      try {
        await supabase
          .from('audit_logs')
          .insert({
            user_id: user.id,
            action: existingSubmission ? 'resubmit_assignment' : 'submit_assignment',
            resource_type: 'submission',
            resource_id: result.data.id,
            details: {
              assignment_id: assignmentId,
              file_name: uploadResult.fileName,
              status: submissionData.status
            }
          });
      } catch (logError) {
        console.error('Error logging action:', logError);
        // Don't fail the submission if logging fails
      }

      Alert.alert(
        'Success', 
        existingSubmission ? 'Assignment resubmitted successfully!' : 'Assignment submitted successfully!',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error) {
      console.error('Error submitting assignment:', error);
      Alert.alert('Error', 'Failed to submit assignment. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isOverdue = assignment && new Date() > new Date(assignment.due_date);

  if (!assignment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <Text>Loading assignment...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#001F3F" />
        </TouchableOpacity>
        <Text style={styles.title}>Submit Assignment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.assignmentCard}>
          <Text style={styles.assignmentTitle}>{assignment.title}</Text>
          <Text style={styles.assignmentClass}>{assignment.classes.name}</Text>
          
          <View style={styles.dueDateContainer}>
            <Ionicons 
              name="time" 
              size={16} 
              color={isOverdue ? "#FF3B30" : "#007AFF"} 
            />
            <Text style={[styles.dueDate, isOverdue && styles.overdue]}>
              Due: {new Date(assignment.due_date).toLocaleString()}
            </Text>
          </View>

          {isOverdue && (
            <View style={styles.overdueWarning}>
              <Ionicons name="warning" size={16} color="#FF3B30" />
              <Text style={styles.overdueText}>This assignment is overdue</Text>
            </View>
          )}

          {assignment.description && (
            <View style={styles.descriptionContainer}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{assignment.description}</Text>
            </View>
          )}

          {assignment.instructions && (
            <View style={styles.instructionsContainer}>
              <Text style={styles.sectionTitle}>Instructions</Text>
              <Text style={styles.instructions}>{assignment.instructions}</Text>
            </View>
          )}

          <View style={styles.scoreContainer}>
            <Text style={styles.sectionTitle}>Maximum Score</Text>
            <Text style={styles.maxScore}>{assignment.max_score} points</Text>
          </View>
        </View>

        {existingSubmission && (
          <View style={styles.existingSubmissionCard}>
            <View style={styles.submissionHeader}>
              <Ionicons name="document" size={20} color="#34C759" />
              <Text style={styles.submissionTitle}>Current Submission</Text>
            </View>
            <Text style={styles.submissionFile}>{existingSubmission.file_name}</Text>
            <Text style={styles.submissionDate}>
              Submitted: {new Date(existingSubmission.submitted_at).toLocaleString()}
            </Text>
            {existingSubmission.grade !== null && (
              <Text style={styles.submissionGrade}>
                Grade: {existingSubmission.grade}/{assignment.max_score}
              </Text>
            )}
            {existingSubmission.feedback && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.feedbackTitle}>Feedback:</Text>
                <Text style={styles.feedback}>{existingSubmission.feedback}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.uploadCard}>
          <Text style={styles.uploadTitle}>
            {existingSubmission ? 'Submit New Version' : 'Upload Your Work'}
          </Text>
          <Text style={styles.uploadSubtitle}>
            Select a PDF file to submit (Max 10MB)
          </Text>

          {selectedFile ? (
            <View style={styles.selectedFile}>
              <View style={styles.fileInfo}>
                <Ionicons name="document" size={24} color="#FF3B30" />
                <View style={styles.fileDetails}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setSelectedFile(null)}>
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickDocument}>
              <Ionicons name="cloud-upload" size={32} color="#007AFF" />
              <Text style={styles.uploadButtonText}>Choose PDF File</Text>
            </TouchableOpacity>
          )}

          {!assignment.allow_multiple_submissions && existingSubmission && (
            <View style={styles.warningContainer}>
              <Ionicons name="warning" size={16} color="#FF9500" />
              <Text style={styles.warningText}>
                This will replace your current submission
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={uploading ? "Submitting..." : (existingSubmission ? "Resubmit" : "Submit Assignment")}
          onPress={submitAssignment}
          disabled={!selectedFile || uploading}
          style={[styles.submitButton, (!selectedFile || uploading) && styles.disabledButton]}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F3F',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  assignmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 4,
  },
  assignmentClass: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 12,
  },
  dueDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dueDate: {
    fontSize: 14,
    color: '#007AFF',
  },
  overdue: {
    color: '#FF3B30',
  },
  overdueWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF2F2',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  overdueText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
    marginBottom: 8,
  },
  descriptionContainer: {
    marginBottom: 16,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  instructionsContainer: {
    marginBottom: 16,
  },
  instructions: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  scoreContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  maxScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  existingSubmissionCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  submissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  submissionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#34C759',
  },
  submissionFile: {
    fontSize: 14,
    fontWeight: '600',
    color: '#001F3F',
    marginBottom: 4,
  },
  submissionDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  submissionGrade: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 8,
  },
  feedbackContainer: {
    marginTop: 8,
  },
  feedbackTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#001F3F',
    marginBottom: 4,
  },
  feedback: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  uploadCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 4,
  },
  uploadSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  uploadButton: {
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectedFile: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#001F3F',
  },
  fileSize: {
    fontSize: 12,
    color: '#666',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#FF9500',
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  submitButton: {
    backgroundColor: '#34C759',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
});