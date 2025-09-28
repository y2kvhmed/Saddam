import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    name: '',
    role: 'student',
    school_id: '',
    class_id: ''
  });
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    loadUsers();
    loadSchools();
    loadClasses();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select(`
          *,
          schools(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      Alert.alert('Error', 'Failed to load users');
    }
  };

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select('*')
        .order('name');

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  };

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*, schools(name)')
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if ((newUser.role === 'teacher' || newUser.role === 'student') && !newUser.class_id) {
      Alert.alert('Error', 'Please select a class for teachers and students');
      return;
    }

    setLoading(true);
    try {
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password
      });

      if (authError) throw authError;
      
      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      // Create app user record
      const { error: userError } = await supabase
        .from('app_users')
        .insert({
          id: authData.user.id,
          email: newUser.email,
          name: newUser.name,
          role: newUser.role,
          school_id: newUser.school_id || null,
          created_at: new Date().toISOString(),
          is_active: true
        });

      if (userError) {
        console.error('User creation error:', userError);
        throw userError;
      }

      // Enroll student in class if selected
      if (newUser.role === 'student' && newUser.class_id) {
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({
            student_id: authData.user.id,
            class_id: newUser.class_id
          });

        if (enrollError) console.error('Enrollment error:', enrollError);
      }

      Alert.alert('Success', 'User created successfully');
      setModalVisible(false);
      setNewUser({ email: '', password: '', name: '', role: 'student', school_id: '', class_id: '' });
      loadUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      Alert.alert('Error', error.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string, userEmail: string) => {
    if (userEmail === 'Bedaya.sdn@gmail.com') {
      Alert.alert('Error', 'Cannot delete super administrator');
      return;
    }

    Alert.alert(
      'Delete User',
      'Are you sure you want to delete this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('app_users')
                .delete()
                .eq('id', userId);

              if (error) throw error;
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
  };

  const UserItem = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={[styles.roleIndicator, { backgroundColor: getRoleColor(item.role) }]} />
        <View style={styles.userDetails}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          <Text style={styles.userRole}>{item.role.toUpperCase()}</Text>
          {item.schools && <Text style={styles.userSchool}>{item.schools.name}</Text>}
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteUser(item.id, item.email)}
      >
        <Ionicons name="trash" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#FF3B30';
      case 'teacher': return '#007AFF';
      case 'student': return '#34C759';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Users</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={users}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <UserItem item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New User</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#001F3F" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
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
                  style={[
                    styles.roleOption,
                    newUser.role === role && styles.roleOptionSelected
                  ]}
                  onPress={() => setNewUser({ ...newUser, role })}
                >
                  <Text style={[
                    styles.roleText,
                    newUser.role === role && styles.roleTextSelected
                  ]}>
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
                    style={[
                      styles.classOption,
                      newUser.class_id === cls.id && styles.classOptionSelected
                    ]}
                    onPress={() => setNewUser({ ...newUser, class_id: cls.id })}
                  >
                    <Text style={[
                      styles.classText,
                      newUser.class_id === cls.id && styles.classTextSelected
                    ]}>
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
          </View>
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
  addButton: {
    backgroundColor: '#001F3F',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
  },
  userCard: {
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
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  roleIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#001F3F',
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 4,
  },
  userSchool: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
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
  form: {
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 8,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  roleOptionSelected: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  roleTextSelected: {
    color: 'white',
  },
  createButton: {
    backgroundColor: '#001F3F',
  },
  classSelector: {
    marginBottom: 24,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
    marginBottom: 12,
  },
  classOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  classOptionSelected: {
    backgroundColor: '#001F3F',
    borderColor: '#001F3F',
  },
  classText: {
    fontSize: 14,
    color: '#666',
  },
  classTextSelected: {
    color: 'white',
  },
});