import React, { useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getCurrentUser } from '../../lib/auth';
import { User } from '../../types';

export default function TabLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!currentUser) {
          router.replace('/login');
          return;
        }
        setUser(currentUser);
      } catch (error) {
        console.error('Error loading user:', error);
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  if (loading || !user) return null;

  // Admin tabs
  if (user.role === 'admin') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#001F3F',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="admin-dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="manage-users"
          options={{
            title: 'Users',
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="manage-schools"
          options={{
            title: 'Schools',
            tabBarIcon: ({ color, size }) => <Ionicons name="school" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="admin-classes"
          options={{
            title: 'Classes',
            tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="admin-profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
        {/* Hide other role tabs */}
        <Tabs.Screen name="teacher-dashboard" options={{ href: null }} />
        <Tabs.Screen name="teacher-classes" options={{ href: null }} />
        <Tabs.Screen name="teacher-assignments" options={{ href: null }} />
        <Tabs.Screen name="teacher-submissions" options={{ href: null }} />
        <Tabs.Screen name="teacher-profile" options={{ href: null }} />
        <Tabs.Screen name="student-dashboard" options={{ href: null }} />
        <Tabs.Screen name="student-assignments" options={{ href: null }} />
        <Tabs.Screen name="student-submissions" options={{ href: null }} />
        <Tabs.Screen name="student-lessons" options={{ href: null }} />
        <Tabs.Screen name="student-profile" options={{ href: null }} />
      </Tabs>
    );
  }

  // Teacher tabs
  if (user.role === 'teacher') {
    return (
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#001F3F',
          tabBarInactiveTintColor: '#666',
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="teacher-dashboard"
          options={{
            title: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="teacher-classes"
          options={{
            title: 'Classes',
            tabBarIcon: ({ color, size }) => <Ionicons name="library" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="teacher-assignments"
          options={{
            title: 'Assignments',
            tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="teacher-submissions"
          options={{
            title: 'Submissions',
            tabBarIcon: ({ color, size }) => <Ionicons name="folder" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="teacher-profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
          }}
        />
        {/* Hide other role tabs */}
        <Tabs.Screen name="admin-dashboard" options={{ href: null }} />
        <Tabs.Screen name="manage-users" options={{ href: null }} />
        <Tabs.Screen name="manage-schools" options={{ href: null }} />
        <Tabs.Screen name="admin-classes" options={{ href: null }} />
        <Tabs.Screen name="admin-profile" options={{ href: null }} />
        <Tabs.Screen name="student-dashboard" options={{ href: null }} />
        <Tabs.Screen name="student-assignments" options={{ href: null }} />
        <Tabs.Screen name="student-submissions" options={{ href: null }} />
        <Tabs.Screen name="student-lessons" options={{ href: null }} />
        <Tabs.Screen name="student-profile" options={{ href: null }} />
      </Tabs>
    );
  }

  // Student tabs
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#001F3F',
        tabBarInactiveTintColor: '#666',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="student-dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="student-assignments"
        options={{
          title: 'Assignments',
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="student-submissions"
        options={{
          title: 'My Work',
          tabBarIcon: ({ color, size }) => <Ionicons name="folder" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="student-lessons"
        options={{
          title: 'Lessons',
          tabBarIcon: ({ color, size }) => <Ionicons name="videocam" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="student-profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} />,
        }}
      />
      {/* Hide other role tabs */}
      <Tabs.Screen name="admin-dashboard" options={{ href: null }} />
      <Tabs.Screen name="manage-users" options={{ href: null }} />
      <Tabs.Screen name="manage-schools" options={{ href: null }} />
      <Tabs.Screen name="admin-classes" options={{ href: null }} />
      <Tabs.Screen name="admin-profile" options={{ href: null }} />
      <Tabs.Screen name="teacher-dashboard" options={{ href: null }} />
      <Tabs.Screen name="teacher-classes" options={{ href: null }} />
      <Tabs.Screen name="teacher-assignments" options={{ href: null }} />
      <Tabs.Screen name="teacher-submissions" options={{ href: null }} />
      <Tabs.Screen name="teacher-profile" options={{ href: null }} />
    </Tabs>
  );
}