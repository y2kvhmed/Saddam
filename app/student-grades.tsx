import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';

export default function StudentGrades() {
  const [grades, setGrades] = useState([]);
  const [stats, setStats] = useState({ average: 0, total: 0, graded: 0 });
  const router = useRouter();

  useEffect(() => {
    loadGrades();
  }, []);

  const loadGrades = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          assignments(
            title,
            max_score,
            due_date,
            classes(name)
          )
        `)
        .eq('student_id', user.id)
        .order('submitted_at', { ascending: false });

      if (error) throw error;

      const gradedSubmissions = data?.filter(s => s.grade !== null) || [];
      const totalGrades = gradedSubmissions.reduce((sum, s) => sum + s.grade, 0);
      const average = gradedSubmissions.length > 0 ? totalGrades / gradedSubmissions.length : 0;

      setGrades(data || []);
      setStats({
        average: Math.round(average),
        total: data?.length || 0,
        graded: gradedSubmissions.length
      });
    } catch (error) {
      console.error('Error loading grades:', error);
    }
  };

  const getGradeColor = (grade, maxScore = 100) => {
    const percentage = (grade / maxScore) * 100;
    if (percentage >= 90) return '#34C759';
    if (percentage >= 80) return '#007AFF';
    if (percentage >= 70) return '#FF9500';
    return '#FF3B30';
  };

  const getGradeLetter = (grade, maxScore = 100) => {
    const percentage = (grade / maxScore) * 100;
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#001F3F" />
        </TouchableOpacity>
        <Text style={styles.title}>My Grades</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.statsCard}>
          <Text style={styles.statsTitle}>Grade Summary</Text>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.average}%</Text>
              <Text style={styles.statLabel}>Average</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.graded}</Text>
              <Text style={styles.statLabel}>Graded</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Assignment Grades</Text>

        {grades.map((submission) => (
          <View key={submission.id} style={styles.gradeCard}>
            <View style={styles.gradeInfo}>
              <Text style={styles.assignmentTitle}>
                {submission.assignments?.title}
              </Text>
              <Text style={styles.className}>
                {submission.assignments?.classes?.name}
              </Text>
              <Text style={styles.submissionDate}>
                Submitted: {new Date(submission.submitted_at).toLocaleDateString()}
              </Text>
              {submission.feedback && (
                <Text style={styles.feedback}>{submission.feedback}</Text>
              )}
            </View>
            
            <View style={styles.gradeDisplay}>
              {submission.grade !== null ? (
                <>
                  <View style={[
                    styles.gradeCircle,
                    { backgroundColor: getGradeColor(submission.grade, submission.assignments?.max_score) }
                  ]}>
                    <Text style={styles.gradeLetter}>
                      {getGradeLetter(submission.grade, submission.assignments?.max_score)}
                    </Text>
                  </View>
                  <Text style={styles.gradeScore}>
                    {submission.grade}/{submission.assignments?.max_score || 100}
                  </Text>
                  <Text style={styles.gradePercentage}>
                    {Math.round((submission.grade / (submission.assignments?.max_score || 100)) * 100)}%
                  </Text>
                </>
              ) : (
                <View style={styles.pendingGrade}>
                  <Ionicons name="time" size={24} color="#FF9500" />
                  <Text style={styles.pendingText}>Pending</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        {grades.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="document-text" size={48} color="#666" />
            <Text style={styles.emptyText}>No grades yet</Text>
            <Text style={styles.emptySubtext}>Complete assignments to see your grades here</Text>
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
  statsCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statsTitle: { fontSize: 18, fontWeight: 'bold', color: '#001F3F', marginBottom: 16, textAlign: 'center' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#001F3F' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#001F3F', marginBottom: 16 },
  gradeCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 12, flexDirection: 'row', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  gradeInfo: { flex: 1, marginRight: 16 },
  assignmentTitle: { fontSize: 16, fontWeight: 'bold', color: '#001F3F', marginBottom: 4 },
  className: { fontSize: 14, color: '#007AFF', marginBottom: 4 },
  submissionDate: { fontSize: 12, color: '#666', marginBottom: 8 },
  feedback: { fontSize: 14, color: '#666', fontStyle: 'italic', backgroundColor: '#f8f9fa', padding: 8, borderRadius: 6 },
  gradeDisplay: { alignItems: 'center', minWidth: 80 },
  gradeCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  gradeLetter: { fontSize: 20, fontWeight: 'bold', color: 'white' },
  gradeScore: { fontSize: 14, fontWeight: '600', color: '#001F3F' },
  gradePercentage: { fontSize: 12, color: '#666' },
  pendingGrade: { alignItems: 'center' },
  pendingText: { fontSize: 12, color: '#FF9500', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#666', marginTop: 12 },
  emptySubtext: { fontSize: 14, color: '#666', marginTop: 4, textAlign: 'center' }
});