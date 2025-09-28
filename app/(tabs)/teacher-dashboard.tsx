import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getCurrentUser, signOut } from '../../lib/auth';
import { useRouter } from 'expo-router';

export default function TeacherDashboard() {
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalAssignments: 0,
    totalStudents: 0,
    pendingSubmissions: 0
  });
  const [user, setUser] = useState(null);
  const [recentAssignments, setRecentAssignments] = useState([]);
  const router = useRouter();

  useEffect(() => {
    loadUser();
    loadStats();
    loadRecentAssignments();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const loadStats = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const [classesRes, assignmentsRes, submissionsRes] = await Promise.all([
        supabase.from('classes').select('id').eq('teacher_id', currentUser.id),
        supabase.from('assignments').select('id').eq('teacher_id', currentUser.id),
        supabase.from('submissions').select('id, status, assignments!inner(teacher_id)').eq('assignments.teacher_id', currentUser.id)
      ]);

      const totalStudents = await supabase
        .from('enrollments')
        .select('student_id', { count: 'exact' })
        .in('class_id', classesRes.data?.map(c => c.id) || []);

      setStats({
        totalClasses: classesRes.data?.length || 0,
        totalAssignments: assignmentsRes.data?.length || 0,
        totalStudents: totalStudents.count || 0,
        pendingSubmissions: submissionsRes.data?.filter(s => s.status === 'submitted').length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentAssignments = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          classes(name),
          submissions(count)
        `)
        .eq('teacher_id', currentUser.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setRecentAssignments(data || []);
    } catch (error) {
      console.error('Error loading recent assignments:', error);
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.name || 'Teacher'}</Text>
        </View>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={24} color="#001F3F" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Overview</Text>
        
        <View style={styles.statsGrid}>
          <StatCard
            title="My Classes"
            value={stats.totalClasses}
            icon="library"
            color="#007AFF"
          />
          <StatCard
            title="Assignments"
            value={stats.totalAssignments}
            icon="document-text"
            color="#34C759"
          />
          <StatCard
            title="Students"
            value={stats.totalStudents}
            icon="people"
            color="#FF9500"
          />
          <StatCard
            title="Pending Reviews"
            value={stats.pendingSubmissions}
            icon="time"
            color="#FF3B30"
          />
        </View>

        <Text style={styles.sectionTitle}>Quick Actions</Text>
        
        <View style={styles.actionsGrid}>
          <QuickAction
            title="Create Assignment"
            icon="add-circle"
            color="#007AFF"
            onPress={() => router.push('/create-assignment')}
          />
          <QuickAction
            title="View Submissions"
            icon="folder"
            color="#34C759"
            onPress={() => router.push('/(tabs)/teacher-submissions')}
          />
          <QuickAction
            title="Upload Lesson"
            icon="videocam"
            color="#FF9500"
            onPress={() => router.push('/upload-lesson')}
          />
          <QuickAction
            title="Class Reports"
            icon="analytics"
            color="#5856D6"
            onPress={() => router.push('/class-reports')}
          />
        </View>

        <Text style={styles.sectionTitle}>Recent Assignments</Text>
        
        {recentAssignments.map((assignment) => (
          <View key={assignment.id} style={styles.assignmentCard}>
            <View style={styles.assignmentInfo}>
              <Text style={styles.assignmentTitle}>{assignment.title}</Text>
              <Text style={styles.assignmentClass}>{assignment.classes?.name}</Text>
              <Text style={styles.assignmentDate}>
                Due: {new Date(assignment.due_date).toLocaleDateString()}
              </Text>
            </View>
            <View style={styles.assignmentStats}>
              <Text style={styles.submissionCount}>
                {assignment.submissions?.length || 0} submissions
              </Text>
            </View>
          </View>
        ))}
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
  assignmentDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  assignmentStats: {
    alignItems: 'flex-end',
  },
  submissionCount: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
});