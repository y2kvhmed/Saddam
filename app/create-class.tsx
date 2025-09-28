import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';

export default function CreateClass() {
  const [newClass, setNewClass] = useState({ name: '', description: '', school_id: '', teacher_id: '' });
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadSchools();
    loadTeachers();
  }, []);

  const loadSchools = async () => {
    const { data } = await supabase.from('schools').select('*').order('name');
    setSchools(data || []);
  };

  const loadTeachers = async () => {
    const { data } = await supabase.from('app_users').select('*').eq('role', 'teacher').order('name');
    setTeachers(data || []);
  };

  const createClass = async () => {
    if (!newClass.name.trim()) {
      Alert.alert('Error', 'Please enter class name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: newClass.name.trim(),
          description: newClass.description?.trim() || null
        });

      if (error) throw error;

      Alert.alert('Success', 'Class created successfully');
      setNewClass({ name: '', description: '', school_id: '', teacher_id: '' });
      router.back();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to create class');
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
        <Text style={styles.title}>Create Class</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Class Name"
          value={newClass.name}
          onChangeText={(text) => setNewClass({ ...newClass, name: text })}
        />



        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          value={newClass.description}
          onChangeText={(text) => setNewClass({ ...newClass, description: text })}
          multiline
          numberOfLines={3}
        />

        <Button
          title={loading ? "Creating..." : "Create Class"}
          onPress={createClass}
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
  textArea: { height: 80, textAlignVertical: 'top' },
  selector: { marginBottom: 24 },
  selectorLabel: { fontSize: 16, fontWeight: '600', color: '#001F3F', marginBottom: 12 },
  option: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8, backgroundColor: 'white' },
  optionSelected: { backgroundColor: '#001F3F', borderColor: '#001F3F' },
  optionText: { fontSize: 14, color: '#666' },
  optionTextSelected: { color: 'white' },
  createButton: { backgroundColor: '#001F3F', marginTop: 20 }
});