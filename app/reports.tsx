import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';

export default function Reports() {
  const [reports, setReports] = useState({
    usersByRole: {},
    classesBySchool: {},
    assignmentStats: [],
    recentActivity: []
  });
  const router = useRouter();

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const [usersByRole, classesBySchool, assignmentStats, recentActivity] = await Promise.all([
        supabase.from('app_users').select('role').then(res => 
          res.data?.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
          }, {}) || {}
        ),
        supabase.from('classes').select('*, schools(name)').then(res =>
          res.data?.reduce((acc, cls) => {
            const school = cls.schools?.name || 'Unknown';
            acc[school] = (acc[school] || 0) + 1;
            return acc;
          }, {}) || {}
        ),
        supabase.from('assignments').select('*, submissions(*)').then(res =>
          res.data?.map(assignment => ({
            title: assignment.title,
            submissions: assignment.submissions?.length || 0,
            due_date: assignment.due_date
          })) || []
        ),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10).then(res => res.data || [])
      ]);

      setReports({ usersByRole, classesBySchool, assignmentStats, recentActivity });
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'Failed to load reports data');
    }
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
        <Text style={styles.title}>Reports & Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <ReportCard title="Users by Role">
          {Object.entries(reports.usersByRole).map(([role, count]) => (
            <View key={role} style={styles.statRow}>
              <Text style={styles.statLabel}>{role.toUpperCase()}</Text>
              <Text style={styles.statValue}>{count}</Text>
            </View>
          ))}
        </ReportCard>

        <ReportCard title="Classes by School">
          {Object.entries(reports.classesBySchool).map(([school, count]) => (
            <View key={school} style={styles.statRow}>
              <Text style={styles.statLabel}>{school}</Text>
              <Text style={styles.statValue}>{count} classes</Text>
            </View>
          ))}
        </ReportCard>

        <ReportCard title="Assignment Statistics">
          {reports.assignmentStats.slice(0, 5).map((assignment, index) => (
            <View key={index} style={styles.statRow}>
              <Text style={styles.statLabel}>{assignment.title}</Text>
              <Text style={styles.statValue}>{assignment.submissions} submissions</Text>
            </View>
          ))}
        </ReportCard>

        <ReportCard title="Recent Activity">
          {reports.recentActivity.map((activity, index) => (
            <View key={index} style={styles.activityRow}>
              <Text style={styles.activityAction}>{activity.action}</Text>
              <Text style={styles.activityTime}>
                {new Date(activity.created_at).toLocaleDateString()}
              </Text>
            </View>
          ))}
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
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  statLabel: { fontSize: 14, color: '#666', flex: 1 },
  statValue: { fontSize: 14, fontWeight: '600', color: '#001F3F' },
  activityRow: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  activityAction: { fontSize: 14, color: '#001F3F', fontWeight: '500' },
  activityTime: { fontSize: 12, color: '#666', marginTop: 2 }
});