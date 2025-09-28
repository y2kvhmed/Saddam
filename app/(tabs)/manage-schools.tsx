import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/Button';

export default function ManageSchools() {
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newSchool, setNewSchool] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase
        .from('schools')
        .select(`
          *,
          classes(*),
          app_users(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchools(data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
      Alert.alert('Error', 'Failed to load schools');
    }
  };

  const createSchool = async () => {
    if (!newSchool.name.trim()) {
      Alert.alert('Error', 'Please enter a school name');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('schools')
        .insert({
          name: newSchool.name,
          description: newSchool.description || null
        });

      if (error) throw error;

      Alert.alert('Success', 'School created successfully');
      setModalVisible(false);
      setNewSchool({ name: '', description: '' });
      loadSchools();
    } catch (error) {
      console.error('Error creating school:', error);
      Alert.alert('Error', error.message || 'Failed to create school');
    } finally {
      setLoading(false);
    }
  };

  const deleteSchool = async (schoolId: string, schoolName: string) => {
    Alert.alert(
      'Delete School',
      `Are you sure you want to delete "${schoolName}"? This will also delete all associated classes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('schools')
                .delete()
                .eq('id', schoolId);

              if (error) throw error;
              loadSchools();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete school');
            }
          }
        }
      ]
    );
  };

  const SchoolItem = ({ item }) => (
    <View style={styles.schoolCard}>
      <View style={styles.schoolInfo}>
        <Text style={styles.schoolName}>{item.name}</Text>
        {item.description && (
          <Text style={styles.schoolDescription}>{item.description}</Text>
        )}
        <View style={styles.schoolStats}>
          <View style={styles.statItem}>
            <Ionicons name="library" size={16} color="#007AFF" />
            <Text style={styles.statText}>{item.classes?.length || 0} Classes</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="people" size={16} color="#34C759" />
            <Text style={styles.statText}>{item.app_users?.length || 0} Users</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => deleteSchool(item.id, item.name)}
      >
        <Ionicons name="trash" size={20} color="#FF3B30" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Schools</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={schools}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <SchoolItem item={item} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="school" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No schools created yet</Text>
            <Text style={styles.emptySubtext}>Tap the + button to create your first school</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create New School</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color="#001F3F" />
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="School Name"
              value={newSchool.name}
              onChangeText={(text) => setNewSchool({ ...newSchool, name: text })}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={newSchool.description}
              onChangeText={(text) => setNewSchool({ ...newSchool, description: text })}
              multiline
              numberOfLines={4}
            />

            <Button
              title={loading ? "Creating..." : "Create School"}
              onPress={createSchool}
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
    flexGrow: 1,
  },
  schoolCard: {
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
  schoolInfo: {
    flex: 1,
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 4,
  },
  schoolDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  schoolStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#666',
  },
  deleteButton: {
    padding: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
    textAlign: 'center',
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
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  createButton: {
    backgroundColor: '#001F3F',
    marginTop: 8,
  },
});