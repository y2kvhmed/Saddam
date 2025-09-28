import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { Button } from '../components/Button';

export default function AssignmentDetails() {
  const [assignment, setAssignment] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { id } = useLocalSearchParams();

  useEffect(() => {
    if (id) {
      loadAssignmentDetails();
    }
  }, [id]);

  const loadAssignmentDetails = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Load assignment details
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          *,
          classes(name, teacher_id),
          app_users!assignments_teacher_id_fkey(name)
        `)
        .eq('id', id)
        .single();

      if (assignmentError) throw assignmentError;

      // Load student's submission if exists
      const { data: submissionData } = await supabase
        .from('submissions')
        .select('*')
        .eq('assignment_id', id)
        .eq('student_id', user.id)
        .single();

      setAssignment(assignmentData);
      setSubmission(submissionData);
    } catch (error) {
      console.error('Error loading assignment details:', error);
      Alert.alert('Error', 'Failed to load assignment details');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAssignment = () => {
    router.push(`/submit-assignment?assignmentId=${id}`);
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'submitted': return '#007AFF';
      case 'graded': return '#34C759';
      case 'late': return '#FF9500';
      case 'resubmitted': return '#5856D6';
      default: return '#666';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!assignment) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text>Assignment not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const daysUntilDue = getDaysUntilDue(assignment.due_date);
  const isOverdue = daysUntilDue < 0;
  const isUrgent = daysUntilDue <= 2 && daysUntilDue >= 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#001F3F" />
        </TouchableOpacity>
        <Text style={styles.title}>Assignment Details</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.assignmentCard}>
          <Text style={styles.assignmentTitle}>{assignment.title}</Text>
          <Text style={styles.className}>{assignment.classes?.name}</Text>
          <Text style={styles.teacherName}>Teacher: {assignment.app_users?.name}</Text>
          
          <View style={styles.dueDateContainer}>
            <Ionicons 
              name={isOverdue ? "warning" : "time"} 
              size={16} 
              color={isOverdue ? "#FF3B30" : isUrgent ? "#FF9500" : "#666"} 
            />
            <Text style={[
              styles.dueDate,
              isOverdue && styles.overdue,
              isUrgent && styles.urgent
            ]}>
              Due: {new Date(assignment.due_date).toLocaleDateString()}
              {isOverdue && " (Overdue)"}
              {isUrgent && !isOverdue && " (Due Soon)"}
            </Text>
          </View>

          <View style={styles.scoreContainer}>
            <Ionicons name="trophy" size={16} color="#ffe164" />
            <Text style={styles.maxScore}>Max Score: {assignment.max_score} points</Text>
          </View>
        </View>

        {assignment.description && (
          <View style={styles.descriptionCard}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{assignment.description}</Text>
          </View>
        )}

        {assignment.instructions && (
          <View style={styles.instructionsCard}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <Text style={styles.instructions}>{assignment.instructions}</Text>
          </View>
        )}

        {submission ? (
          <View style={styles.submissionCard}>
            <Text style={styles.sectionTitle}>Your Submission</Text>
            
            <View style={styles.submissionInfo}>
              <View style={styles.statusRow}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(submission.status) }]}>
                  <Text style={styles.statusText}>{submission.status.toUpperCase()}</Text>
                </View>
                <Text style={styles.submissionDate}>
                  Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
                </Text>
              </View>

              <Text style={styles.fileName}>File: {submission.file_name}</Text>

              {submission.grade !== null && (
                <View style={styles.gradeContainer}>
                  <Text style={styles.gradeLabel}>Grade:</Text>
                  <Text style={styles.grade}>
                    {submission.grade}/{assignment.max_score} 
                    ({assignment.max_score > 0 ? Math.round((submission.grade / assignment.max_score) * 100) : 0}%)
                  </Text>
                </View>
              )}

              {submission.feedback && (
                <View style={styles.feedbackContainer}>
                  <Text style={styles.feedbackLabel}>Teacher Feedback:</Text>
                  <Text style={styles.feedback}>{submission.feedback}</Text>
                </View>
              )}
            </View>

            {assignment.allow_multiple_submissions && (
              <Button
                title="Resubmit Assignment"
                onPress={handleSubmitAssignment}
                style={styles.resubmitButton}
              />
            )}
          </View>
        ) : (
          <View style={styles.noSubmissionCard}>
            <Ionicons name="document-text" size={48} color="#666" />
            <Text style={styles.noSubmissionTitle}>No Submission Yet</Text>
            <Text style={styles.noSubmissionText}>
              You haven't submitted this assignment yet.
            </Text>
            
            <Button
              title={isOverdue ? "Submit Late" : "Submit Assignment"}
              onPress={handleSubmitAssignment}
              style={[styles.submitButton, isOverdue && styles.lateSubmitButton]}
            />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#001F3F' },
  content: { flex: 1, padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  assignmentCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  assignmentTitle: { fontSize: 24, fontWeight: 'bold', color: '#001F3F', marginBottom: 8 },
  className: { fontSize: 16, color: '#007AFF', marginBottom: 4 },
  teacherName: { fontSize: 14, color: '#666', marginBottom: 16 },
  dueDateContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  dueDate: { fontSize: 14, color: '#666', marginLeft: 8 },
  overdue: { color: '#FF3B30', fontWeight: '600' },
  urgent: { color: '#FF9500', fontWeight: '600' },
  scoreContainer: { flexDirection: 'row', alignItems: 'center' },
  maxScore: { fontSize: 14, color: '#666', marginLeft: 8 },
  descriptionCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  instructionsCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#001F3F', marginBottom: 12 },
  description: { fontSize: 16, color: '#333', lineHeight: 24 },
  instructions: { fontSize: 16, color: '#333', lineHeight: 24 },
  submissionCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  submissionInfo: { marginBottom: 16 },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: 'white' },
  submissionDate: { fontSize: 12, color: '#666' },
  fileName: { fontSize: 14, color: '#333', marginBottom: 12 },
  gradeContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  gradeLabel: { fontSize: 16, fontWeight: '600', color: '#001F3F', marginRight: 8 },
  grade: { fontSize: 16, fontWeight: 'bold', color: '#34C759' },
  feedbackContainer: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8 },
  feedbackLabel: { fontSize: 14, fontWeight: '600', color: '#001F3F', marginBottom: 8 },
  feedback: { fontSize: 14, color: '#333', lineHeight: 20 },
  resubmitButton: { backgroundColor: '#007AFF' },
  noSubmissionCard: { backgroundColor: 'white', borderRadius: 12, padding: 40, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  noSubmissionTitle: { fontSize: 18, fontWeight: 'bold', color: '#001F3F', marginTop: 16, marginBottom: 8 },
  noSubmissionText: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24 },
  submitButton: { backgroundColor: '#34C759', minWidth: 200 },
  lateSubmitButton: { backgroundColor: '#FF9500' }
});