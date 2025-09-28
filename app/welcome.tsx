import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withDelay, withSequence } from 'react-native-reanimated';
import { Button } from '../components/Button';

const { width, height } = Dimensions.get('window');

export default function Welcome() {
  const router = useRouter();
  const logoScale = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const cardsOpacity = useSharedValue(0);
  const cardsTranslateY = useSharedValue(40);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    logoScale.value = withSequence(
      withSpring(1.2, { duration: 600 }),
      withSpring(1, { duration: 400 })
    );
    titleOpacity.value = withDelay(300, withSpring(1, { duration: 800 }));
    titleTranslateY.value = withDelay(300, withSpring(0, { duration: 800 }));
    cardsOpacity.value = withDelay(600, withSpring(1, { duration: 800 }));
    cardsTranslateY.value = withDelay(600, withSpring(0, { duration: 800 }));
    buttonOpacity.value = withDelay(900, withSpring(1, { duration: 600 }));
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const cardsAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cardsOpacity.value,
    transform: [{ translateY: cardsTranslateY.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#001F3F', '#003366', '#004080']}
        style={styles.backgroundGradient}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.heroSection}>
              <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
                <Image 
                  source={require('../assets/icon.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
                <View style={styles.logoGlow} />
              </Animated.View>
              
              <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
                <Text style={styles.mainTitle}>Physics</Text>
                <Text style={styles.subtitle}>with Mr. Saddam</Text>
                <View style={styles.taglineContainer}>
                  <View style={styles.taglineLine} />
                  <Text style={styles.tagline}>Your path to the A+</Text>
                  <View style={styles.taglineLine} />
                </View>
              </Animated.View>
            </View>



            <Animated.View style={[styles.ctaSection, buttonAnimatedStyle]}>
              <Button
                title="Enter Learning Portal"
                onPress={() => router.push('/login')}
                style={styles.ctaButton}
              />
              <Text style={styles.ctaSubtext}>Join thousands of successful students</Text>
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
  content: {
    flex: 1,
    paddingHorizontal: width > 768 ? 64 : 24,
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: height * 0.1,
  },
  logoContainer: {
    position: 'relative',
    marginBottom: 40,
  },
  logoImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  logoGlow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.1)',
    top: -10,
    left: -10,
    zIndex: -1,
  },
  titleContainer: {
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: width > 768 ? 56 : 42,
    fontWeight: '900',
    color: 'white',
    letterSpacing: -2,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: width > 768 ? 24 : 20,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '300',
    marginBottom: 24,
  },
  taglineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  taglineLine: {
    width: 30,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  tagline: {
    fontSize: 16,
    color: '#ffe164',
    fontWeight: '600',
    letterSpacing: 1,
  },

  ctaSection: {
    paddingBottom: 40,
    alignItems: 'center',
  },
  ctaButton: {
    backgroundColor: '#ffe164',
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 30,
    shadowColor: '#ffe164',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
    marginBottom: 16,
  },
  ctaSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '400',
  },
});