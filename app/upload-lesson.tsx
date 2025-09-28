import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth';
import { Button } from '../components/Button';
import * as DocumentPicker from 'expo-document-picker';

export default function UploadLesson() {
  const [lesson, setLesson] = useState({
    title: '',
    description: '',
    class_id: '',
    video_url: '',
    duration_minutes: '',
    scheduled_at: ''
  });
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const router = useRouter();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      const user = await getCurrentUser();
      if (!user) return;

      const { data } = await supabase
        .from('classes')
        .select('*, schools(name)')
        .eq('teacher_id', user.id)
        .order('name');
      
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/*'],
        copyToCacheDirectory: true
      });

      if (!result.canceled && result.assets[0]) {
        setSelectedVideo(result.assets[0]);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick video file');
    }
  };

  const uploadLesson = async () => {
    if (!lesson.title || !lesson.class_id) {
      Alert.alert('Error', 'Please fill in required fields');
      return;
    }

    setLoading(true);
    try {
      const user = await getCurrentUser();
      if (!user) throw new Error('User not found');

      let videoPath = lesson.video_url;

      // Upload video if selected
      if (selectedVideo) {
        const fileExt = selectedVideo.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `lessons/${lesson.class_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('recordings')
          .upload(filePath, selectedVideo);

        if (uploadError) throw uploadError;
        videoPath = filePath;
      }

      const { error } = await supabase
        .from('lessons')
        .insert({
          title: lesson.title,
          description: lesson.description,
          class_id: lesson.class_id,
          teacher_id: user.id,
          video_url: videoPath || lesson.video_url,
          video_path: videoPath,
          duration_minutes: parseInt(lesson.duration_minutes) || null,
          scheduled_at: lesson.scheduled_at || null,
          is_published: true
        });

      if (error) throw error;

      Alert.alert('Success', 'Lesson uploaded successfully');
      router.back();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to upload lesson');
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
        <Text style={styles.title}>Upload Lesson</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <TextInput
          style={styles.input}
          placeholder="Lesson Title"
          value={lesson.title}
          onChangeText={(text) => setLesson({ ...lesson, title: text })}
        />

        <View style={styles.selector}>
          <Text style={styles.selectorLabel}>Select Class:</Text>
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[styles.option, lesson.class_id === cls.id && styles.optionSelected]}
              onPress={() => setLesson({ ...lesson, class_id: cls.id })}
            >
              <Text style={[styles.optionText, lesson.class_id === cls.id && styles.optionTextSelected]}>
                {cls.name} {cls.schools?.name && `(${cls.schools.name})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Lesson Description"
          value={lesson.description}
          onChangeText={(text) => setLesson({ ...lesson, description: text })}
          multiline
          numberOfLines={4}
        />

        <TextInput
          style={styles.input}
          placeholder="Video URL (YouTube, Vimeo, etc.)"
          value={lesson.video_url}
          onChangeText={(text) => setLesson({ ...lesson, video_url: text })}
        />

        <TouchableOpacity style={styles.videoButton} onPress={pickVideo}>
          <Ionicons name="videocam" size={24} color="#007AFF" />
          <Text style={styles.videoButtonText}>
            {selectedVideo ? selectedVideo.name : 'Or Upload Video File'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.input}
          placeholder="Duration (minutes)"
          value={lesson.duration_minutes}
          onChangeText={(text) => setLesson({ ...lesson, duration_minutes: text })}
          keyboardType="numeric"
        />

        <Button
          title={loading ? "Uploading..." : "Upload Lesson"}
          onPress={uploadLesson}
          disabled={loading}
          style={styles.uploadButton}
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
  textArea: { height: 100, textAlignVertical: 'top' },
  selector: { marginBottom: 24 },
  selectorLabel: { fontSize: 16, fontWeight: '600', color: '#001F3F', marginBottom: 12 },
  option: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1, borderColor: '#e0e0e0', marginBottom: 8, backgroundColor: 'white' },
  optionSelected: { backgroundColor: '#001F3F', borderColor: '#001F3F' },
  optionText: { fontSize: 14, color: '#666' },
  optionTextSelected: { color: 'white' },
  videoButton: { flexDirection: 'row', alignItems: 'center', padding: 16, borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8, backgroundColor: 'white', marginBottom: 16 },
  videoButtonText: { marginLeft: 12, fontSize: 16, color: '#007AFF' },
  uploadButton: { backgroundColor: '#001F3F', marginTop: 20 }
});