import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';

export default function AdminClasses() {
  const [classes, setClasses] = useState([]);
  const [schools, setSchools] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [newClass, setNewClass] = useState({
    name: '',
    description: '',
    school_id: '',
    teacher_id: ''
  });
  const [selectedStudents, setSelectedStudents] = useState([]);

  useEffect(() => {
    loadClasses();
    loadSchools();
    loadTeachers();
    loadStudents();
  }, []);

  const loadClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          schools(name),
          app_users!classes_teacher_id_fkey(name),
          enrollments(
            id,
            app_users!enrollments_student_id_fkey(name, email)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
      Alert.alert('Error', 'Failed to load classes');
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

  const loadTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('role', 'teacher')
        .order('name');

      if (error) throw error;
      setTeachers(data || []);
    } catch (error) {
      console.error('Error loading teachers:', error);
    }
  };

  const loadStudents = async () => {
    try {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('role', 'student')
        .order('name');

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error loading students:', error);
    }
  };

  const createClass = async () => {
    if (!newClass.name || !newClass.school_id || !newClass.teacher_id) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('classes')
        .insert({
          name: newClass.name,
          description: newClass.description,
          school_id: newClass.school_id,
          teacher_id: newClass.teacher_id
        });

      if (error) throw error;

      Alert.alert('Success', 'Class created successfully');
      setModalVisible(false);
      setNewClass({ name: '', description: '', school_id: '', teacher_id: '' });
      loadClasses();
    } catch (error) {
      console.error('Error creating class:', error);
      Alert.alert('Error', error.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const enrollStudents = async () => {
    if (selectedStudents.length === 0) {
      Alert.alert('Error', 'Please select at least one student');
      return;
    }

    setLoading(true);
    try {
      const enrollments = selectedStudents.map(studentId => ({
        class_id: selectedClass.id,
        student_id: studentId
      }));

      const { error } = await supabase
        .from('enrollments')
        .insert(enrollments);

      if (error) throw error;

      Alert.alert('Success', 'Students enrolled successfully');
      setEnrollModalVisible(false);
      setSelectedStudents([]);
      loadClasses();
    } catch (error) {
      console.error('Error enrolling students:', error);
      Alert.alert('Error', 'Failed to enroll students');
    } finally {
      setLoading(false);
    }
  };

  const ClassItem = ({ item }) => (
    <View style={styles.classCard}>
      <View style={styles.classInfo}>
        <Text style={styles.className}>{item.name}</Text>
        <Text style={styles.classSchool}>{item.schools?.name}</Text>
        <Text style={styles.classTeacher}>Teacher: {item.app_users?.name}</Text>
        {item.description && (
          <Text style={styles.classDescription}>{item.description}</Text>
        )}
        <Text style={styles.studentCount}>
          {item.enrollments?.length || 0} students enrolled
        </Text>
      </View>
      <TouchableOpacity
        style={styles.enrollButton}
        onPress={() => {
          setSelectedClass(item);
          setEnrollModalVisible(true);
        }}
      >
        <Ionicons name="person-add" size={20} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Classes</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={classes}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ClassItem item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* Create Class Modal */}
      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New Class</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#001F3F" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Class Name"
              value={newClass.name}
              onChangeText={(text) => setNewClass({ ...newClass, name: text })}
            />
            
            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>School</Text>
              <Picker
                selectedValue={newClass.school_id}
                onValueChange={(value) => setNewClass({ ...newClass, school_id: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select School" value="" />
                {schools.map((school) => (
                  <Picker.Item key={school.id} label={school.name} value={school.id} />
                ))}
              </Picker>
            </View>

            <View style={styles.pickerContainer}>
              <Text style={styles.pickerLabel}>Teacher</Text>
              <Picker
                selectedValue={newClass.teacher_id}
                onValueChange={(value) => setNewClass({ ...newClass, teacher_id: value })}
                style={styles.picker}
              >
                <Picker.Item label="Select Teacher" value="" />
                {teachers.map((teacher) => (
                  <Picker.Item key={teacher.id} label={teacher.name} value={teacher.id} />
                ))}
              </Picker>
            </View>

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
          </View>
        </SafeAreaView>
      </Modal>

      {/* Enroll Students Modal */}
      <Modal visible={enrollModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Enroll Students</Text>
            <TouchableOpacity onPress={() => setEnrollModalVisible(false)}>
              <Ionicons name="close" size={24} color="#001F3F" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <Text style={styles.sectionTitle}>Select Students to Enroll:</Text>
            <FlatList
              data={students}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.studentItem,
                    selectedStudents.includes(item.id) && styles.studentItemSelected
                  ]}
                  onPress={() => {
                    if (selectedStudents.includes(item.id)) {
                      setSelectedStudents(selectedStudents.filter(id => id !== item.id));
                    } else {
                      setSelectedStudents([...selectedStudents, item.id]);
                    }
                  }}
                >
                  <Text style={styles.studentName}>{item.name}</Text>
                  <Text style={styles.studentEmail}>{item.email}</Text>
                  {selectedStudents.includes(item.id) && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.studentList}
            />

            <Button
              title={loading ? "Enrolling..." : `Enroll ${selectedStudents.length} Students`}
              onPress={enrollStudents}
              disabled={loading || selectedStudents.length === 0}
              style={styles.enrollButtonModal}
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
  classCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 4,
  },
  classSchool: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 2,
  },
  classTeacher: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  classDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  studentCount: {
    fontSize: 12,
    color: '#34C759',
    fontWeight: '600',
  },
  enrollButton: {
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
    flex: 1,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
  },
  createButton: {
    backgroundColor: '#001F3F',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
    marginBottom: 16,
  },
  studentList: {
    flex: 1,
    marginBottom: 16,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginBottom: 8,
  },
  studentItemSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#001F3F',
    flex: 1,
  },
  studentEmail: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  enrollButtonModal: {
    backgroundColor: '#007AFF',
  },
});