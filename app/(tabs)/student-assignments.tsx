import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';

export default function StudentAssignments() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      // Get student's enrolled classes
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', currentUser.id)
        .eq('active', true);

      const classIds = enrollments?.map(e => e.class_id) || [];

      if (classIds.length === 0) {
        setLoading(false);
        return;
      }

      // Get assignments for enrolled classes
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select(`
          *,
          classes(name)
        `)
        .in('class_id', classIds)
        .eq('is_published', true)
        .order('due_date', { ascending: true });

      if (assignmentsError) throw assignmentsError;

      // Get student's submissions
      const assignmentIds = assignmentsData?.map(a => a.id) || [];
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', currentUser.id)
        .in('assignment_id', assignmentIds);

      if (submissionsError) {
        console.error('Error loading submissions:', submissionsError);
      }

      // Create submissions lookup
      const submissionsLookup = {};
      submissionsData?.forEach(sub => {
        submissionsLookup[sub.assignment_id] = sub;
      });

      setAssignments(assignmentsData || []);
      setSubmissions(submissionsLookup);
    } catch (error) {
      console.error('Error loading assignments:', error);
      Alert.alert('Error', 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentStatus = (assignment) => {
    const submission = submissions[assignment.id];
    const now = new Date();
    const dueDate = new Date(assignment.due_date);
    
    if (submission) {
      if (submission.grade !== null) {
        return { status: 'graded', color: '#34C759', icon: 'checkmark-circle' };
      }
      return { status: 'submitted', color: '#007AFF', icon: 'document' };
    }
    
    if (now > dueDate) {
      return { status: 'overdue', color: '#FF3B30', icon: 'time' };
    }
    
    return { status: 'pending', color: '#FF9500', icon: 'clock' };
  };

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const AssignmentItem = ({ item }) => {
    const status = getAssignmentStatus(item);
    const submission = submissions[item.id];
    const daysUntilDue = getDaysUntilDue(item.due_date);
    const isOverdue = daysUntilDue < 0;

    return (
      <TouchableOpacity
        style={styles.assignmentCard}
        onPress={() => {
          if (submission) {
            router.push(`/assignment-details?id=${item.id}&mode=student`);
          } else {
            router.push(`/submit-assignment?assignmentId=${item.id}`);
          }
        }}
      >
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <Text style={styles.assignmentClass}>{item.classes?.name}</Text>
            
            <View style={styles.assignmentMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={14} color={isOverdue ? "#FF3B30" : "#666"} />
                <Text style={[styles.metaText, isOverdue && styles.overdueText]}>
                  {isOverdue ? `${Math.abs(daysUntilDue)} days overdue` : 
                   daysUntilDue === 0 ? 'Due today' :
                   daysUntilDue === 1 ? 'Due tomorrow' :
                   `Due in ${daysUntilDue} days`}
                </Text>
              </View>
              
              <View style={styles.metaItem}>
                <Ionicons name="trophy" size={14} color="#FF9500" />
                <Text style={styles.metaText}>{item.max_score} points</Text>
              </View>
            </View>

            {submission && submission.grade !== null && (
              <View style={styles.gradeContainer}>
                <Text style={styles.gradeText}>
                  Grade: {submission.grade}/{item.max_score}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: status.color }]}>
              <Ionicons name={status.icon} size={16} color="white" />
            </View>
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.status.toUpperCase()}
            </Text>
          </View>
        </View>
        
        {item.description && (
          <Text style={styles.assignmentDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Assignments</Text>
        <TouchableOpacity onPress={loadAssignments}>
          <Ionicons name="refresh" size={24} color="#001F3F" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <Text>Loading assignments...</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AssignmentItem item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No assignments available</Text>
              <Text style={styles.emptySubtext}>Check back later for new assignments</Text>
            </View>
          }
        />
      )}
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
  assignmentCard: {
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
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 4,
  },
  assignmentClass: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  assignmentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  overdueText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  gradeContainer: {
    marginTop: 4,
  },
  gradeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#34C759',
  },
  statusContainer: {
    alignItems: 'center',
    gap: 4,
  },
  statusBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
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
});