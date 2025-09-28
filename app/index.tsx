import React, { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { getCurrentUser } from '../lib/auth';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        // Route based on user role
        if (user.role === 'admin') {
          router.replace('/(tabs)/admin-dashboard');
        } else if (user.role === 'teacher') {
          router.replace('/(tabs)/teacher-dashboard');
        } else if (user.role === 'student') {
          router.replace('/(tabs)/student-dashboard');
        } else {
          router.replace('/(tabs)/admin-dashboard');
        }
      } else {
        router.replace('/welcome');
      }
    } catch (error) {
      console.error('Auth check error:', error);
      router.replace('/welcome');
    }
  };

  return null;
}