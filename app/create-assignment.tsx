import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { Button } from '../components/Button';

export default function CreateAssignment() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const [assignment, setAssignment] = useState({
    title: '',
    description: '',
    instructions: '',
    class_id: '',
    due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    max_score: 100,
    allow_multiple_submissions: false
  });

  useEffect(() => {
    loadUser();
    loadTeacherClasses();
  }, []);

  const loadUser = async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
  };

  const loadTeacherClasses = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', currentUser.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes');
    }
  };

  const createAssignment = async () => {
    if (!assignment.title.trim() || !assignment.class_id) {
      Alert.alert('Error', 'Please fill in title and select a class');
      return;
    }

    if (!user?.id) {
      Alert.alert('Error', 'User not found');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assignments')
        .insert({
          title: assignment.title.trim(),
          description: assignment.description.trim(),
          instructions: assignment.instructions.trim(),
          class_id: assignment.class_id,
          teacher_id: user.id,
          due_date: assignment.due_date.toISOString(),
          max_score: assignment.max_score,
          allow_multiple_submissions: assignment.allow_multiple_submissions,
          is_published: true
        })
        .select()
        .single();

      if (error) throw error;

      // Log the action
      try {
        await supabase
          .from('audit_logs')
          .insert({
            user_id: user.id,
            action: 'create_assignment',
            resource_type: 'assignment',
            resource_id: data.id,
            details: {
              title: assignment.title,
              class_id: assignment.class_id
            }
          });
      } catch (logError) {
        console.error('Error logging action:', logError);
      }

      Alert.alert('Success', 'Assignment created successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error creating assignment:', error);
      Alert.alert('Error', 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setAssignment({ ...assignment, due_date: selectedDate });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#001F3F" />
        </TouchableOpacity>
        <Text style={styles.title}>Create Assignment</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Assignment Title *</Text>
            <TextInput
              style={styles.input}
              value={assignment.title}
              onChangeText={(text) => setAssignment({ ...assignment, title: text })}
              placeholder="Enter assignment title"
              maxLength={100}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Class *</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={assignment.class_id}
                onValueChange={(value) => setAssignment({ ...assignment, class_id: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select a class" value="" />
                {classes.map((cls) => (
                  <Picker.Item key={cls.id} label={cls.name} value={cls.id} />
                ))}
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={assignment.description}
              onChangeText={(text) => setAssignment({ ...assignment, description: text })}
              placeholder="Brief description of the assignment"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={assignment.instructions}
              onChangeText={(text) => setAssignment({ ...assignment, instructions: text })}
              placeholder="Detailed instructions for students"
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Due Date</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar" size={20} color="#001F3F" />
              <Text style={styles.dateText}>
                {assignment.due_date.toLocaleDateString()} at {assignment.due_date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Maximum Score</Text>
            <TextInput
              style={styles.input}
              value={assignment.max_score.toString()}
              onChangeText={(text) => {
                const score = parseInt(text) || 0;
                setAssignment({ ...assignment, max_score: Math.max(0, Math.min(1000, score)) });
              }}
              placeholder="100"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.switchGroup}>
            <TouchableOpacity
              style={styles.switchContainer}
              onPress={() => setAssignment({ 
                ...assignment, 
                allow_multiple_submissions: !assignment.allow_multiple_submissions 
              })}
            >
              <View style={[
                styles.switch,
                assignment.allow_multiple_submissions && styles.switchActive
              ]}>
                {assignment.allow_multiple_submissions && (
                  <View style={styles.switchThumb} />
                )}
              </View>
              <View style={styles.switchLabel}>
                <Text style={styles.switchTitle}>Allow Multiple Submissions</Text>
                <Text style={styles.switchSubtitle}>
                  Students can resubmit their work multiple times
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={assignment.due_date}
            mode="datetime"
            display="default"
            onChange={onDateChange}
            minimumDate={new Date()}
          />
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          title={loading ? "Creating..." : "Create Assignment"}
          onPress={createAssignment}
          disabled={loading || !assignment.title.trim() || !assignment.class_id}
          style={styles.createButton}
        />
      </View>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#001F3F',
  },
  content: {
    flex: 1,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: 'white',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: 'white',
  },
  picker: {
    height: 50,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    backgroundColor: 'white',
    gap: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#001F3F',
  },
  switchGroup: {
    marginBottom: 20,
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    gap: 16,
  },
  switch: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#007AFF',
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'white',
    alignSelf: 'flex-end',
  },
  switchLabel: {
    flex: 1,
  },
  switchTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
  },
  switchSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  footer: {
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  createButton: {
    backgroundColor: '#001F3F',
  },
});