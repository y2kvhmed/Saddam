import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getCurrentUser } from '../../lib/auth';

export default function TeacherAssignments() {
  const router = useRouter();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAssignments();
  }, []);

  const loadAssignments = async () => {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) return;

      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          classes(name),
          submissions(*)
        `)
        .eq('teacher_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssignments(data || []);
    } catch (error) {
      console.error('Error loading assignments:', error);
      Alert.alert('Error', 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  const deleteAssignment = async (assignmentId, title) => {
    Alert.alert(
      'Delete Assignment',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('assignments')
                .delete()
                .eq('id', assignmentId);

              if (error) throw error;
              loadAssignments();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete assignment');
            }
          }
        }
      ]
    );
  };

  const AssignmentItem = ({ item }) => {
    const isOverdue = new Date() > new Date(item.due_date);
    const submissionCount = item.submissions?.length || 0;

    return (
      <View style={styles.assignmentCard}>
        <View style={styles.assignmentHeader}>
          <View style={styles.assignmentInfo}>
            <Text style={styles.assignmentTitle}>{item.title}</Text>
            <Text style={styles.assignmentClass}>{item.classes?.name}</Text>
            <View style={styles.assignmentMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="time" size={14} color={isOverdue ? "#FF3B30" : "#007AFF"} />
                <Text style={[styles.metaText, isOverdue && styles.overdueText]}>
                  Due: {new Date(item.due_date).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="document" size={14} color="#34C759" />
                <Text style={styles.metaText}>{submissionCount} submissions</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="trophy" size={14} color="#FF9500" />
                <Text style={styles.metaText}>{item.max_score} pts</Text>
              </View>
            </View>
          </View>
          <View style={styles.assignmentActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push(`/assignment-details?id=${item.id}&mode=teacher`)}
            >
              <Ionicons name="eye" size={20} color="#007AFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => deleteAssignment(item.id, item.title)}
            >
              <Ionicons name="trash" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </View>
        </View>
        {item.description && (
          <Text style={styles.assignmentDescription} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Assignments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/create-assignment')}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <Text>Loading assignments...</Text>
        </View>
      ) : (
        <FlatList
          data={assignments}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AssignmentItem item={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="document-text" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No assignments yet</Text>
              <Text style={styles.emptySubtext}>Tap the + button to create your first assignment</Text>
            </View>
          }
        />
      )}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 20,
    flexGrow: 1,
  },
  assignmentCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  assignmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  assignmentInfo: {
    flex: 1,
  },
  assignmentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#001F3F',
    marginBottom: 4,
  },
  assignmentClass: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 8,
  },
  assignmentMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#666',
  },
  overdueText: {
    color: '#FF3B30',
  },
  assignmentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  assignmentDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 12,
    lineHeight: 20,
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
});