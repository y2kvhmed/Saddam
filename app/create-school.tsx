import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Button } from '../components/Button';

export default function CreateSchool() {
  const [school, setSchool] = useState({ name: '', description: '' });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const createSchool = async () => {
    console.log('Create school button pressed');
    
    if (!school.name.trim()) {
      Alert.alert('Error', 'Please enter school name');
      return;
    }

    setLoading(true);
    console.log('Attempting to create school:', school.name);
    
    try {
      const { data, error } = await supabase
        .from('schools')
        .insert({ 
          name: school.name.trim(), 
          description: school.description?.trim() || null 
        })
        .select();

      console.log('Supabase response:', { data, error });
      
      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      Alert.alert('Success', 'School created successfully');
      setSchool({ name: '', description: '' });
      router.back();
    } catch (error: any) {
      console.error('Create school error:', error);
      Alert.alert('Error', error.message || 'Failed to create school');
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
        <Text style={styles.title}>Create School</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="School Name"
          value={school.name}
          onChangeText={(text) => setSchool({ ...school, name: text })}
        />
        
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Description (optional)"
          value={school.description}
          onChangeText={(text) => setSchool({ ...school, description: text })}
          multiline
          numberOfLines={4}
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={createSchool}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Creating..." : "Create School"}
          </Text>
        </TouchableOpacity>
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
  textArea: { height: 100, textAlignVertical: 'top' },
  createButton: { backgroundColor: '#001F3F', marginTop: 20 },
  button: { backgroundColor: '#001F3F', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonDisabled: { backgroundColor: '#ccc' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});