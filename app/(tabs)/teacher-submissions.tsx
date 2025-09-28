import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';
import { Button } from '../../components/Button';

export default function TeacherSubmissions() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeModalVisible, setGradeModalVisible] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          assignments!inner(
            id,
            title,
            max_score,
            teacher_id,
            classes(name)
          ),
          app_users!submissions_student_id_fkey(
            name,
            email
          )
        `)
        .eq('assignments.teacher_id', currentUser.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
      Alert.alert('Error', 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const openGradeModal = (submission) => {
    setSelectedSubmission(submission);
    setGrade(submission.grade?.toString() || '');
    setFeedback(submission.feedback || '');
    setGradeModalVisible(true);
  };

  const submitGrade = async () => {
    if (!selectedSubmission) return;
    
    const gradeValue = parseInt(grade);
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > selectedSubmission.assignments.max_score) {
      Alert.alert('Invalid Grade', `Grade must be between 0 and ${selectedSubmission.assignments.max_score}`);
      return;
    }

    setGrading(true);
    try {
      const currentUser = await getCurrentUser();
      
      const { error } = await supabase
        .from('submissions')
        .update({
          grade: gradeValue,
          feedback: feedback.trim(),
          status: 'graded',
          graded_at: new Date().toISOString(),
          graded_by: currentUser.id
        })
        .eq('id', selectedSubmission.id);

      if (error) throw error;

      // Log the action
      try {
        await supabase
          .from('audit_logs')
          .insert({
            user_id: currentUser.id,
            action: 'grade_submission',
            resource_type: 'submission',
            resource_id: selectedSubmission.id,
            details: {
              assignment_id: selectedSubmission.assignment_id,
              student_id: selectedSubmission.student_id,
              grade: gradeValue,
              max_score: selectedSubmission.assignments.max_score
            }
          });
      } catch (logError) {
        console.error('Error logging action:', logError);
        // Don't fail the grading if logging fails
      }

      Alert.alert('Success', 'Grade submitted successfully');
      setGradeModalVisible(false);
      loadSubmissions();
    } catch (error) {
      console.error('Error submitting grade:', error);
      Alert.alert('Error', 'Failed to submit grade');
    } finally {
      setGrading(false);
    }
  };

  const downloadSubmission = async (submission) => {
    try {
      const { data, error } = await supabase.storage
        .from('submissions')
        .createSignedUrl(submission.file_path, 3600); // 1 hour expiry

      if (error) throw error;
      
      // In a real app, you would open this URL or download the file
      Alert.alert('Download', `File URL: ${data.signedUrl}`);
    } catch (error) {
      console.error('Error downloading submission:', error);
      Alert.alert('Error', 'Failed to download submission');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'graded': return '#34C759';
      case 'submitted': return '#007AFF';
      case 'late': return '#FF9500';
      case 'resubmitted': return '#5856D6';
      default: return '#666';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const SubmissionItem = ({ item }) => {
    const statusColor = getStatusColor(item.status);
    const isGraded = item.grade !== null;

    return (
      <View style={styles.submissionCard}>
        <View style={styles.submissionHeader}>
          <View style={styles.submissionInfo}>
            <Text style={styles.assignmentTitle}>{item.assignments.title}</Text>
            <Text style={styles.studentName}>{item.app_users.name}</Text>
            <Text style={styles.className}>{item.assignments.classes.name}</Text>
            
            <View style={styles.submissionMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={14} color="#666" />
                <Text style={styles.metaText}>
                  {new Date(item.submitted_at).toLocaleString()}
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Ionicons name="document" size={14} color="#666" />
                <Text style={styles.metaText}>
                  {item.file_name} ({formatFileSize(item.file_size)})
                </Text>
              </View>
            </View>

            {isGraded && (
              <View style={styles.gradeContainer}>
                <Text style={styles.gradeText}>
                  Grade: {item.grade}/{item.assignments.max_score}
                </Text>
                {item.feedback && (
                  <Text style={styles.feedbackText} numberOfLines={2}>
                    Feedback: {item.feedback}
                  </Text>
                )}
              </View>
            )}
          </View>
          
          <View style={styles.submissionActions}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
            </View>
            
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => downloadSubmission(item)}
              >
                <Ionicons name="download" size={20} color="#007AFF" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openGradeModal(item)}
              >
                <Ionicons name="create" size={20} color="#FF9500" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Student Submissions</Text>
        <TouchableOpacity onPress={loadSubmissions}>
          <Ionicons name="refresh" size={24} color="#001F3F" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <Text>Loading submissions...</Text>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SubmissionItem item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="folder-open" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No submissions yet</Text>
              <Text style={styles.emptySubtext}>Student submissions will appear here</Text>
            </View>
          }
        />
      )}

      {/* Grade Modal */}
      <Modal visible={gradeModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Grade Submission</Text>
            <TouchableOpacity onPress={() => setGradeModalVisible(false)}>
              <Ionicons name="close" size={24} color="#001F3F" />
            </TouchableOpacity>
          </View>

          {selectedSubmission && (
            <View style={styles.modalContent}>
              <View style={styles.submissionDetails}>
                <Text style={styles.modalAssignmentTitle}>
                  {selectedSubmission.assignments.title}
                </Text>
                <Text style={styles.modalStudentName}>
                  {selectedSubmission.app_users.name}
                </Text>
                <Text style={styles.modalFileName}>
                  File: {selectedSubmission.file_name}
                </Text>
              </View>

              <View style={styles.gradeForm}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>
                    Grade (0 - {selectedSubmission.assignments.max_score})
                  </Text>
                  <TextInput
                    style={styles.gradeInput}
                    value={grade}
                    onChangeText={setGrade}
                    placeholder="Enter grade"
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Feedback (Optional)</Text>
                  <TextInput
                    style={[styles.gradeInput, styles.feedbackInput]}
                    value={feedback}
                    onChangeText={setFeedback}
                    placeholder="Enter feedback for the student"
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <Button
                  title={grading ? "Submitting..." : "Submit Grade"}
                  onPress={submitGrade}
                  disabled={grading || !grade.trim()}
                  style={styles.submitGradeButton}
                />
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#001F3F',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
    flexGrow: 1,
  },
  submissionCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  submissionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  submissionInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 4,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 2,
  },
  className: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  submissionMeta: {
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  gradeContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34C759',
  },
  feedbackText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  submissionActions: {
    alignItems: 'flex-end',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F3F',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  submissionDetails: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  modalAssignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 4,
  },
  modalStudentName: {
    fontSize: 16,
    color: '#007AFF',
    marginBottom: 4,
  },
  modalFileName: {
    fontSize: 14,
    color: '#666',
  },
  gradeForm: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
    marginBottom: 8,
  },
  gradeInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  feedbackInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  submitGradeButton: {
    backgroundColor: '#34C759',
    marginTop: 20,
  },
});