import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';

export default function ClassReports() {
  const [reports, setReports] = useState({
    classStats: [],
    assignmentPerformance: [],
    studentProgress: []
  });
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Get teacher's classes with stats
      const { data: classes } = await supabase
        .from('classes')
        .select(`
          *,
          enrollments(count),
          assignments(count),
          assignments(
            id,
            title,
            submissions(count, grade)
          )
        `)
        .eq('teacher_id', user.id);

      // Process class statistics
      const classStats = classes?.map(cls => ({
        name: cls.name,
        students: cls.enrollments?.length || 0,
        assignments: cls.assignments?.length || 0,
        avgGrade: calculateAverageGrade(cls.assignments)
      })) || [];

      // Get assignment performance
      const { data: assignments } = await supabase
        .from('assignments')
        .select(`
          *,
          submissions(grade, status),
          classes(name)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      const assignmentPerformance = assignments?.map(assignment => ({
        title: assignment.title,
        className: assignment.classes?.name,
        totalSubmissions: assignment.submissions?.length || 0,
        gradedSubmissions: assignment.submissions?.filter(s => s.grade !== null).length || 0,
        averageGrade: assignment.submissions?.reduce((sum, s) => sum + (s.grade || 0), 0) / (assignment.submissions?.length || 1)
      })) || [];

      setReports({ classStats, assignmentPerformance, studentProgress: [] });
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const calculateAverageGrade = (assignments) => {
    if (!assignments || assignments.length === 0) return 0;
    
    const allGrades = assignments.flatMap(a => 
      a.submissions?.map(s => s.grade).filter(g => g !== null) || []
    );
    
    return allGrades.length > 0 
      ? allGrades.reduce((sum, grade) => sum + grade, 0) / allGrades.length 
      : 0;
  };

  const ReportCard = ({ title, children }) => (
    <View style={styles.reportCard}>
      <Text style={styles.reportTitle}>{title}</Text>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#001F3F" />
        </TouchableOpacity>
        <Text style={styles.title}>Class Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <ReportCard title="Class Overview">
          {reports.classStats.map((cls, index) => (
            <View key={index} style={styles.classRow}>
              <Text style={styles.className}>{cls.name}</Text>
              <View style={styles.classStats}>
                <Text style={styles.statText}>{cls.students} students</Text>
                <Text style={styles.statText}>{cls.assignments} assignments</Text>
                <Text style={styles.statText}>Avg: {cls.avgGrade.toFixed(1)}%</Text>
              </View>
            </View>
          ))}
        </ReportCard>

        <ReportCard title="Assignment Performance">
          {reports.assignmentPerformance.map((assignment, index) => (
            <View key={index} style={styles.assignmentRow}>
              <View style={styles.assignmentInfo}>
                <Text style={styles.assignmentTitle}>{assignment.title}</Text>
                <Text style={styles.assignmentClass}>{assignment.className}</Text>
              </View>
              <View style={styles.assignmentStats}>
                <Text style={styles.statValue}>
                  {assignment.gradedSubmissions}/{assignment.totalSubmissions}
                </Text>
                <Text style={styles.statLabel}>graded</Text>
                <Text style={styles.avgGrade}>
                  {assignment.averageGrade.toFixed(1)}% avg
                </Text>
              </View>
            </View>
          ))}
        </ReportCard>

        <ReportCard title="Quick Actions">
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/create-assignment')}
          >
            <Ionicons name="add-circle" size={24} color="#007AFF" />
            <Text style={styles.actionText}>Create New Assignment</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/(tabs)/teacher-submissions')}
          >
            <Ionicons name="folder" size={24} color="#34C759" />
            <Text style={styles.actionText}>Review Submissions</Text>
          </TouchableOpacity>
        </ReportCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#001F3F' },
  content: { flex: 1, padding: 20 },
  reportCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  reportTitle: { fontSize: 18, fontWeight: 'bold', color: '#001F3F', marginBottom: 12 },
  classRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  className: { fontSize: 16, fontWeight: '600', color: '#001F3F', flex: 1 },
  classStats: { flexDirection: 'row', gap: 12 },
  statText: { fontSize: 12, color: '#666' },
  assignmentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  assignmentInfo: { flex: 1 },
  assignmentTitle: { fontSize: 14, fontWeight: '600', color: '#001F3F' },
  assignmentClass: { fontSize: 12, color: '#666', marginTop: 2 },
  assignmentStats: { alignItems: 'flex-end' },
  statValue: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  statLabel: { fontSize: 10, color: '#666' },
  avgGrade: { fontSize: 12, color: '#34C759', marginTop: 2 },
  actionButton: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  actionText: { marginLeft: 12, fontSize: 16, color: '#001F3F' }
});