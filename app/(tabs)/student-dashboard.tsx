import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getCurrentUser, signOut } from '../../lib/auth';
import { useRouter } from 'expo-router';

export default function StudentDashboard() {
  const [stats, setStats] = useState({
    totalAssignments: 0,
    completedAssignments: 0,
    pendingAssignments: 0,
    averageGrade: 0
  });
  const [user, setUser] = useState(null);
  const [upcomingAssignments, setUpcomingAssignments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    loadUser();
    loadStats();
    loadUpcomingAssignments();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const loadStats = async () => {
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
        setStats({ totalAssignments: 0, completedAssignments: 0, pendingAssignments: 0, averageGrade: 0 });
        return;
      }

      // Get assignments for enrolled classes
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .in('class_id', classIds);

      const assignmentIds = assignments?.map(a => a.id) || [];

      // Get student's submissions
      const { data: submissions } = await supabase
        .from('submissions')
        .select('*')
        .eq('student_id', currentUser.id)
        .in('assignment_id', assignmentIds);

      const completedCount = submissions?.length || 0;
      const totalCount = assignmentIds.length;
      const gradedSubmissions = submissions?.filter(s => s.grade !== null) || [];
      const averageGrade = gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length 
        : 0;

      setStats({
        totalAssignments: totalCount,
        completedAssignments: completedCount,
        pendingAssignments: totalCount - completedCount,
        averageGrade: Math.round(averageGrade)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadUpcomingAssignments = async () => {
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

      if (classIds.length === 0) return;

      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          classes(name),
          submissions!left(id, status)
        `)
        .in('class_id', classIds)
        .gte('due_date', new Date().toISOString())
        .order('due_date', { ascending: true })
        .limit(5);

      if (error) throw error;

      // Filter out assignments that are already submitted
      const filteredAssignments = data?.filter(assignment => 
        !assignment.submissions?.some(sub => sub.id)
      ) || [];

      setUpcomingAssignments(filteredAssignments);
    } catch (error) {
      console.error('Error loading upcoming assignments:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/welcome');
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out');
    }
  };

  const StatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={styles.statContent}>
        <View>
          <Text style={styles.statValue}>{value}</Text>
          <Text style={styles.statTitle}>{title}</Text>
        </View>
        <Ionicons name={icon} size={32} color={color} />
      </View>
    </View>
  );

  const QuickAction = ({ title, icon, onPress, color }) => (
    <TouchableOpacity style={styles.actionCard} onPress={onPress}>
      <View style={[styles.actionIcon, { backgroundColor: color }]}>
        <Ionicons name={icon} size={24} color="white" />
      </View>
      <Text style={styles.actionTitle}>{title}</Text>
    </TouchableOpacity>
  );

  const getDaysUntilDue = (dueDate) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Student'}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={24} color="#001F3F" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Your Progress</Text>
        
        <View style={styles.statsGrid}>
          <StatCard
            title="Total Assignments"
            value={stats.totalAssignments}
            icon="document-text"
            color="#007AFF"
          />
          <StatCard
            title="Completed"
            value={stats.completedAssignments}
            icon="checkmark-circle"
            color="#34C759"
          />
          <StatCard
            title="Pending"
            value={stats.pendingAssignments}
            icon="time"
            color="#FF9500"
          />
          <StatCard
            title="Average Grade"
            value={stats.averageGrade > 0 ? `${stats.averageGrade}%` : 'N/A'}
            icon="trophy"
            color="#FF3B30"
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <QuickAction
            title="View Assignments"
            icon="list"
            color="#007AFF"
            onPress={() => router.push('/(tabs)/student-assignments')}
          />
          <QuickAction
            title="My Submissions"
            icon="folder"
            color="#34C759"
            onPress={() => router.push('/(tabs)/student-submissions')}
          />
          <QuickAction
            title="Watch Lessons"
            icon="play-circle"
            color="#FF9500"
            onPress={() => router.push('/(tabs)/student-lessons')}
          />
          <QuickAction
            title="My Grades"
            icon="analytics"
            color="#5856D6"
            onPress={() => router.push('/student-grades')}
          />
        </View>

        <Text style={styles.sectionTitle}>Upcoming Assignments</Text>
        
        {upcomingAssignments.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
            <Text style={styles.emptyText}>All caught up!</Text>
            <Text style={styles.emptySubtext}>No pending assignments</Text>
          </View>
        ) : (
          upcomingAssignments.map((assignment) => {
            const daysUntilDue = getDaysUntilDue(assignment.due_date);
            const isUrgent = daysUntilDue <= 2;
            
            return (
              <TouchableOpacity 
                key={assignment.id} 
                style={[styles.assignmentCard, isUrgent && styles.urgentCard]}
                onPress={() => router.push(`/assignment-details?id=${assignment.id}`)}
              >
                <View style={styles.assignmentInfo}>
                  <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                  <Text style={styles.assignmentClass}>{assignment.classes?.name}</Text>
                  <Text style={[styles.assignmentDue, isUrgent && styles.urgentText]}>
                    Due in {daysUntilDue} day{daysUntilDue !== 1 ? 's' : ''}
                  </Text>
                </View>
                <View style={styles.assignmentAction}>
                  {isUrgent && <Ionicons name="warning" size={20} color="#FF3B30" />}
                  <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
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
  greeting: {
    fontSize: 16,
    color: '#666',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#001F3F',
  },
  signOutButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F3F',
    marginTop: 24,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#001F3F',
  },
  statTitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#001F3F',
    textAlign: 'center',
  },
  assignmentCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urgentCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001F3F',
  },
  assignmentClass: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 2,
  },
  assignmentDue: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  urgentText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  assignmentAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#34C759',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
});