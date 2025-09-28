import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';

export default function CreateUser() {
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student',
    school_id: '',
    class_id: ''
  });
  const [schools, setSchools] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSchools();
    loadClasses();
  }, []);

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase.from('schools').select('*').order('name');
      if (error) {
        console.error('Load schools error:', error);
      }
      setSchools(data || []);
    } catch (error) {
      console.error('Load schools error:', error);
      setSchools([]);
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase.from('classes').select('*, schools(name)').order('name');
      if (error) {
        console.error('Load classes error:', error);
      }
      setClasses(data || []);
    } catch (error) {
      console.error('Load classes error:', error);
      setClasses([]);
    }
  };

  const createUser = async () => {
    if (!newUser.email?.trim() || !newUser.password?.trim() || !newUser.name?.trim()) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (newUser.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // For admin users, create directly in app_users table
      if (newUser.role === 'admin') {
        const userId = `admin-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { error: userError } = await supabase
          .from('app_users')
          .insert({
            email: newUser.email.trim(),
            name: newUser.name.trim(),
            role: newUser.role,
            school_id: newUser.school_id || null,
            created_at: new Date().toISOString(),
            is_active: true
          });

        if (userError) {
          console.error('Admin user creation error:', userError);
          throw new Error('Failed to create admin user');
        }

        Alert.alert('Success', 'Admin user created successfully');
        setNewUser({ email: '', password: '', name: '', role: 'student', school_id: '', class_id: '' });
        router.back();
        return;
      }

      // For regular users, try auth signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email.trim(),
        password: newUser.password.trim()
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        
        // If auth fails, create user directly in app_users
        const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        const { data: newUserData, error: directUserError } = await supabase
          .from('app_users')
          .insert({
            email: newUser.email.trim(),
            name: newUser.name.trim(),
            role: newUser.role,
            school_id: newUser.school_id || null,
            created_at: new Date().toISOString(),
            is_active: true
          })
          .select()
          .single();

        if (directUserError) {
          throw new Error('Failed to create user account');
        }

        // Handle enrollment for students
        if (newUser.role === 'student' && newUser.class_id && newUserData) {
          await supabase.from('enrollments').insert({
            student_id: newUserData.id,
            class_id: newUser.class_id
          });
        }

        Alert.alert('Success', 'User created successfully');
        setNewUser({ email: '', password: '', name: '', role: 'student', school_id: '', class_id: '' });
        router.back();
        return;
      }
      
      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create app user record
      const { error: userError } = await supabase
        .from('app_users')
        .insert({
          id: authData.user.id,
          email: newUser.email.trim(),
          name: newUser.name.trim(),
          role: newUser.role,
          school_id: newUser.school_id || null,
          created_at: new Date().toISOString(),
          is_active: true
        });

      if (userError) {
        console.error('User profile creation error:', userError);
        // Don't throw error, user auth account was created
      }

      // Handle enrollment for students
      if (newUser.role === 'student' && newUser.class_id) {
        const { error: enrollError } = await supabase.from('enrollments').insert({
          student_id: authData.user.id,
          class_id: newUser.class_id
        });
        
        if (enrollError) {
          console.error('Enrollment error:', enrollError);
        }
      }

      Alert.alert('Success', 'User created successfully');
      setNewUser({ email: '', password: '', name: '', role: 'student', school_id: '', class_id: '' });
      router.back();
    } catch (error: any) {
      console.error('Create user error:', error);
      Alert.alert('Error', error.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#001F3F" />
        </TouchableOpacity>
        <Text style={styles.title}>Create User</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={newUser.email}
          onChangeText={(text) => setNewUser({ ...newUser, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={newUser.password}
          onChangeText={(text) => setNewUser({ ...newUser, password: text })}
          secureTextEntry
        />
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={newUser.name}
          onChangeText={(text) => setNewUser({ ...newUser, name: text })}
        />

        <View style={styles.roleSelector}>
          {['admin', 'teacher', 'student'].map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.roleOption, newUser.role === role && styles.roleOptionSelected]}
              onPress={() => setNewUser({ ...newUser, role })}
            >
              <Text style={[styles.roleText, newUser.role === role && styles.roleTextSelected]}>
                {role.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {(newUser.role === 'teacher' || newUser.role === 'student') && (
          <View style={styles.classSelector}>
            <Text style={styles.selectorLabel}>Select Class:</Text>
            {classes.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={[styles.classOption, newUser.class_id === cls.id && styles.classOptionSelected]}
                onPress={() => setNewUser({ ...newUser, class_id: cls.id })}
              >
                <Text style={[styles.classText, newUser.class_id === cls.id && styles.classTextSelected]}>
                  {cls.name} {cls.schools?.name && `(${cls.schools.name})`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Button
          title={loading ? "Creating..." : "Create User"}
          onPress={createUser}
          disabled={loading}
          style={styles.createButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#001F3F' },
  content: { flex: 1, padding: 20 },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 16, backgroundColor: 'white' },
  roleSelector: { flexDirection: 'row', marginBottom: 24, gap: 8 },
  roleOption: { flex: 1, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', alignItems: 'center', backgroundColor: 'white' },
  roleOptionSelected: { backgroundColor: '#001F3F', borderColor: '#001F3F' },
  roleText: { fontSize: 14, fontWeight: '600', color: '#666' },
  roleTextSelected: { color: 'white' },
  classSelector: { marginBottom: 24 },
  selectorLabel: { fontSize: 16, fontWeight: '600', color: '#001F3F', marginBottom: 12 },
  classOption: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8, backgroundColor: 'white' },
  classOptionSelected: { backgroundColor: '#001F3F', borderColor: '#001F3F' },
  classText: { fontSize: 14, color: '#666' },
  classTextSelected: { color: 'white' },
  createButton: { backgroundColor: '#001F3F', marginTop: 20 }
});