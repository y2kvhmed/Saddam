import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';

export default function CreateUserSimple() {
  const [user, setUser] = useState({ email: '', name: '', role: 'student' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createUser = async () => {
    if (!user.email.trim() || !user.name.trim()) {
      Alert.alert('Error', 'Please fill email and name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('app_users')
        .insert({
          email: user.email.trim(),
          name: user.name.trim(),
          role: user.role
        });

      if (error) throw error;

      Alert.alert('Success', 'User created successfully');
      setUser({ email: '', name: '', role: 'student' });
      router.back();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create user');
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

      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={user.email}
          onChangeText={(text) => setUser({ ...user, email: text })}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Full Name"
          value={user.name}
          onChangeText={(text) => setUser({ ...user, name: text })}
        />

        <View style={styles.roleSelector}>
          {['admin', 'teacher', 'student'].map((role) => (
            <TouchableOpacity
              key={role}
              style={[styles.roleOption, user.role === role && styles.roleOptionSelected]}
              onPress={() => setUser({ ...user, role })}
            >
              <Text style={[styles.roleText, user.role === role && styles.roleTextSelected]}>
                {role.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Button
          title={loading ? "Creating..." : "Create User"}
          onPress={createUser}
          disabled={loading}
          style={styles.createButton}
        />
      </View>
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
  createButton: { backgroundColor: '#001F3F', marginTop: 20 }
});