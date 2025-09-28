import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getCurrentUser, signOut } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';

export default function StudentProfile() {
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ assignments: 0, completed: 0, averageGrade: 0 });
  const router = useRouter();

  useEffect(() => {
    loadUser();
    loadStats();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      setProfile({
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || ''
      });
    }
  };

  const loadStats = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      // Get enrolled classes
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select('class_id')
        .eq('student_id', user.id)
        .eq('active', true);

      const classIds = enrollments?.map(e => e.class_id) || [];

      if (classIds.length === 0) return;

      // Get assignments for enrolled classes
      const { data: assignments } = await supabase
        .from('assignments')
        .select('id')
        .in('class_id', classIds);

      const assignmentIds = assignments?.map(a => a.id) || [];

      // Get student's submissions
      const { data: submissions } = await supabase
        .from('submissions')
        .select('grade')
        .eq('student_id', user.id)
        .in('assignment_id', assignmentIds);

      const gradedSubmissions = submissions?.filter(s => s.grade !== null) || [];
      const averageGrade = gradedSubmissions.length > 0 
        ? gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length 
        : 0;

      setStats({
        assignments: assignmentIds.length,
        completed: submissions?.length || 0,
        averageGrade: Math.round(averageGrade)
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const updateProfile = async () => {
    if (!profile.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_users')
        .update({
          name: profile.name,
          phone: profile.phone
        })
        .eq('id', user.id);

      if (error) throw error;

      Alert.alert('Success', 'Profile updated successfully');
      setEditing(false);
      loadUser();
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/welcome');
            } catch (error) {
              Alert.alert('Error', 'Failed to sign out');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => editing ? updateProfile() : setEditing(true)}
          >
            <Ionicons name={editing ? "checkmark" : "pencil"} size={20} color="#001F3F" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={48} color="white" />
            </View>
            <Text style={styles.roleText}>STUDENT</Text>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.assignments}</Text>
              <Text style={styles.statLabel}>Assignments</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageGrade > 0 ? `${stats.averageGrade}%` : 'N/A'}</Text>
              <Text style={styles.statLabel}>Average</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={profile.name}
                  onChangeText={(text) => setProfile({ ...profile, name: text })}
                  placeholder="Enter your name"
                />
              ) : (
                <Text style={styles.value}>{profile.name || Math.floor(Math.random() * 10000)}</Text>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{profile.email || 'No email provided'}</Text>
              <Text style={styles.note}>Email cannot be changed</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={profile.phone}
                  onChangeText={(text) => setProfile({ ...profile, phone: text })}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              ) : (
                <Text style={styles.value}>{profile.phone || 'Not provided'}</Text>
              )}
            </View>
          </View>

          {editing && (
            <View style={styles.buttonGroup}>
              <Button
                title={loading ? "Saving..." : "Save Changes"}
                onPress={updateProfile}
                disabled={loading}
                style={styles.saveButton}
              />
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditing(false);
                  setProfile({
                    name: user?.name || '',
                    email: user?.email || '',
                    phone: user?.phone || ''
                  });
                }}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.actionsCard}>
          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/student-assignments')}>
            <Ionicons name="list" size={24} color="#007AFF" />
            <Text style={styles.actionText}>View Assignments</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/student-grades')}>
            <Ionicons name="trophy" size={24} color="#34C759" />
            <Text style={styles.actionText}>My Grades</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/student-lessons')}>
            <Ionicons name="play-circle" size={24} color="#FF9500" />
            <Text style={styles.actionText}>Watch Lessons</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionItem} onPress={() => router.push('/(tabs)/student-submissions')}>
            <Ionicons name="folder" size={24} color="#5856D6" />
            <Text style={styles.actionText}>My Submissions</Text>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.dangerCard}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out" size={24} color="#FF3B30" />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#001F3F' },
  headerButtons: { flexDirection: 'row', gap: 8 },
  editButton: { padding: 8 },
  logoutButton: { padding: 8 },
  content: { flex: 1, padding: 20 },
  profileCard: { backgroundColor: 'white', borderRadius: 12, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  avatarContainer: { alignItems: 'center', marginBottom: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  roleText: { fontSize: 12, fontWeight: '600', color: '#34C759', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24, paddingVertical: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f0f0f0' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#001F3F' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  infoSection: { gap: 20 },
  inputGroup: {},
  label: { fontSize: 14, fontWeight: '600', color: '#001F3F', marginBottom: 8 },
  value: { fontSize: 16, color: '#333', paddingVertical: 8 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16 },
  note: { fontSize: 12, color: '#666', marginTop: 4 },
  buttonGroup: { marginTop: 24, gap: 12 },
  saveButton: { backgroundColor: '#001F3F' },
  cancelButton: { alignItems: 'center', paddingVertical: 12 },
  cancelText: { fontSize: 16, color: '#666' },
  actionsCard: { backgroundColor: 'white', borderRadius: 12, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  actionItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  actionText: { flex: 1, fontSize: 16, color: '#001F3F', marginLeft: 16 },
  dangerCard: { backgroundColor: 'white', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16 },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#FF3B30', marginLeft: 8 }
});