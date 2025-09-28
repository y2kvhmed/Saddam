import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Dimensions, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay } from 'react-native-reanimated';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { signIn, getCurrentUser } from '../lib/auth';


const { width, height } = Dimensions.get('window');

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  
  const cardOpacity = useSharedValue(0);
  const cardTranslateY = useSharedValue(50);
  const headerOpacity = useSharedValue(0);
  
  useEffect(() => {
    headerOpacity.value = withSpring(1, { duration: 800 });
    cardOpacity.value = withDelay(200, withSpring(1, { duration: 800 }));
    cardTranslateY.value = withDelay(200, withSpring(0, { duration: 800 }));
  }, []);
  
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardTranslateY.value }],
  }));

  const headerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email, password);
      
      if (result?.user) {
        // Store test admin session
        if (email === 'Admin') {
          (global as any).testAdminUser = result.user;
        }
        
        // Navigate based on role
        const role = result.user.role;
        if (role === 'admin') {
          router.replace('/(tabs)/admin-dashboard');
        } else if (role === 'teacher') {
          router.replace('/(tabs)/teacher-dashboard');
        } else if (role === 'student') {
          router.replace('/(tabs)/student-dashboard');
        } else {
          router.replace('/(tabs)/admin-dashboard');
        }
      } else {
        Alert.alert('Login Failed', 'Invalid credentials. Please check your username and password.');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'Invalid username or password. Please check your credentials and try again.';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'Please confirm your email address before signing in.';
      } else if (error.message?.includes('Too many requests')) {
        errorMessage = 'Too many login attempts. Please wait a few minutes and try again.';
      } else if (error.message?.includes('Network')) {
        errorMessage = 'Network error. Please check your internet connection.';
      }
      
      Alert.alert('Login Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#001F3F', '#003366']}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <Animated.View style={[styles.header, headerAnimatedStyle]}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <View style={styles.headerContent}>
              <View style={styles.logoMini}>
                <Ionicons name="school" size={24} color="white" />
              </View>
              <Text style={styles.headerTitle}>Physics Portal</Text>
            </View>
            <View style={styles.placeholder} />
          </Animated.View>

          <View style={styles.content}>
            <Animated.View style={[styles.loginCard, cardAnimatedStyle]}>
              <View style={styles.cardHeader}>
                <Text style={styles.welcomeText}>Welcome Back</Text>
                <Text style={styles.subtitleText}>Sign in to continue your physics journey</Text>
              </View>
              
              <View style={styles.form}>
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="mail" size={20} color="#666" />
                  </View>
                  <Input
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.input}
                  />
                </View>
                
                <View style={styles.inputContainer}>
                  <View style={styles.inputIcon}>
                    <Ionicons name="lock-closed" size={20} color="#666" />
                  </View>
                  <Input
                    value={password}
                    onChangeText={setPassword}
                    placeholder="Enter your password"
                    secureTextEntry={!showPassword}
                    style={styles.input}
                  />
                  <TouchableOpacity 
                    style={styles.eyeIcon}
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons 
                      name={showPassword ? "eye-off" : "eye"} 
                      size={20} 
                      color="#666" 
                    />
                  </TouchableOpacity>
                </View>
                
                <Button
                  title={loading ? "Signing in..." : "Sign In"}
                  onPress={handleLogin}
                  disabled={loading}
                  style={styles.signInButton}
                />
              </View>

              <View style={styles.footer}>
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>Secure Login</Text>
                  <View style={styles.dividerLine} />
                </View>
                <View style={styles.securityBadge}>
                  <Ionicons name="shield-checkmark" size={16} color="#28a745" />
                  <Text style={styles.securityText}>Protected by encryption</Text>
                </View>
              </View>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: width > 768 ? 64 : 24,
  },
  loginCard: {
    backgroundColor: 'white',
    borderRadius: 32,
    padding: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  cardHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#001F3F',
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  form: {
    gap: 20,
    marginBottom: 24,
  },
  inputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  input: {
    flex: 1,
    paddingLeft: 48,
    paddingRight: 48,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f0f0f0',
    backgroundColor: '#f8f9fa',
    fontSize: 16,
  },
  eyeIcon: {
    position: 'absolute',
    right: 16,
    zIndex: 1,
  },
  signInButton: {
    backgroundColor: '#001F3F',
    height: 56,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#001F3F',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  footer: {
    alignItems: 'center',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#28a745',
    fontWeight: '500',
  },
});