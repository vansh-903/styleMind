import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { useAppStore } from '../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../src/constants/api';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

export default function SwipeLearningScreen() {
  const [outfits, setOutfits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;
  const { userId, gender, incrementSwipes, updateStyleDNA } = useAppStore();
  const handleSwipeRef = useRef<(action: 'like' | 'dislike' | 'superlike') => void>(() => {});

  useEffect(() => {
    fetchOutfits();
  }, [gender]);

  const fetchOutfits = async () => {
    try {
      // Fetch gender-specific outfits and limit to 10 for onboarding
      const response = await axios.get(API_ENDPOINTS.getOutfits, {
        params: { gender: gender || undefined, limit: 10 }
      });
      setOutfits(response.data.slice(0, 10));
    } catch (error) {
      console.error('Error fetching outfits:', error);
      // Fallback to empty array if API fails
      setOutfits([]);
    } finally {
      setLoading(false);
    }
  };

  const currentOutfit = outfits[currentIndex];
  const nextOutfit = outfits[currentIndex + 1];

  const rotation = position.x.interpolate({
    inputRange: [-width / 2, 0, width / 2],
    outputRange: ['-15deg', '0deg', '15deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const dislikeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const superlikeOpacity = position.y.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const handleSwipe = useCallback(async (action: 'like' | 'dislike' | 'superlike') => {
    if (!currentOutfit) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const outfit = outfits[currentIndex];
    
    // Update local state
    updateStyleDNA(outfit.style_category || outfit.style, action);
    incrementSwipes();

    // Send to backend
    if (userId) {
      try {
        await axios.post(API_ENDPOINTS.createSwipe, {
          user_id: userId,
          outfit_id: outfit.id,
          action: action,
          style_category: outfit.style_category || outfit.style,
        });
      } catch (error) {
        console.error('Error recording swipe:', error);
      }
    }
    
    // Animate card off screen
    const toValue = action === 'dislike' ? -width * 1.5 : 
                    action === 'superlike' ? { x: 0, y: -height } : 
                    width * 1.5;
    
    Animated.spring(position, {
      toValue: typeof toValue === 'number' ? { x: toValue, y: 0 } : toValue,
      useNativeDriver: true,
      speed: 20,
      bounciness: 5,
    }).start(() => {
      position.setValue({ x: 0, y: 0 });
      
      if (currentIndex >= outfits.length - 1) {
        router.replace('/setup-choice');
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    });
  }, [currentIndex, userId]);

  // Keep ref updated with latest handleSwipe
  useEffect(() => {
    handleSwipeRef.current = handleSwipe;
  }, [handleSwipe]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        position.stopAnimation();
        position.setOffset({ x: 0, y: 0 });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });

        if (gesture.dx > 50) setSwipeDirection('like');
        else if (gesture.dx < -50) setSwipeDirection('dislike');
        else if (gesture.dy < -50) setSwipeDirection('superlike');
        else setSwipeDirection(null);
      },
      onPanResponderRelease: (_, gesture) => {
        position.flattenOffset();
        if (gesture.dx > SWIPE_THRESHOLD) {
          handleSwipeRef.current('like');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          handleSwipeRef.current('dislike');
        } else if (gesture.dy < -SWIPE_THRESHOLD) {
          handleSwipeRef.current('superlike');
        } else {
          Animated.spring(position, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
            friction: 5,
          }).start();
        }
        setSwipeDirection(null);
      },
    })
  ).current;

  const progress = outfits.length > 0 ? ((currentIndex) / outfits.length) * 100 : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading outfits...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (outfits.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>No outfits available</Text>
          <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/setup-choice')}>
            <Text style={styles.skipText}>Continue anyway</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Let's learn your style</Text>
        <Text style={styles.subtitle}>Swipe through {outfits.length} outfits to get started</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{currentIndex}/{outfits.length}</Text>
        </View>
      </View>

      <View style={styles.cardsContainer}>
        {/* Next Card (behind) */}
        {nextOutfit && (
          <View style={[styles.card, styles.nextCard]}>
            <Image source={{ uri: nextOutfit.image_url }} style={styles.cardImage} />
          </View>
        )}

        {/* Current Card */}
        {currentOutfit && (
          <Animated.View
            {...panResponder.panHandlers}
            style={[
              styles.card,
              {
                transform: [
                  { translateX: position.x },
                  { translateY: position.y },
                  { rotate: rotation },
                ],
              },
            ]}
          >
            <Image source={{ uri: currentOutfit.image_url }} style={styles.cardImage} />
            
            {/* Overlays */}
            <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
              <Text style={styles.overlayText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.dislikeOverlay, { opacity: dislikeOpacity }]}>
              <Text style={styles.overlayText}>NOPE</Text>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.superlikeOverlay, { opacity: superlikeOpacity }]}>
              <Text style={styles.overlayText}>SUPER</Text>
            </Animated.View>

            <View style={styles.cardInfo}>
              <Text style={styles.cardTitle}>{currentOutfit.name}</Text>
              <View style={styles.tagsContainer}>
                {currentOutfit.tags?.map((tag: string, index: number) => (
                  <View key={index} style={styles.tag}>
                    <Text style={styles.tagText}>{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.dislikeButton]}
          onPress={() => handleSwipe('dislike')}
        >
          <Ionicons name="close" size={32} color={COLORS.error} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.superlikeButton]}
          onPress={() => handleSwipe('superlike')}
        >
          <Ionicons name="star" size={28} color={COLORS.accent} />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.likeButton]}
          onPress={() => handleSwipe('like')}
        >
          <Ionicons name="heart" size={32} color={COLORS.success} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.skipButton} onPress={() => router.replace('/setup-choice')}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: COLORS.surface,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  cardsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  card: {
    width: width - 48,
    height: height * 0.5,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    position: 'absolute',
    backgroundColor: COLORS.surface,
  },
  nextCard: {
    transform: [{ scale: 0.95 }],
    opacity: 0.7,
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
    position: 'absolute',
    top: 20,
    padding: 10,
    borderWidth: 4,
    borderRadius: 8,
  },
  likeOverlay: {
    right: 20,
    borderColor: COLORS.success,
    transform: [{ rotate: '15deg' }],
  },
  dislikeOverlay: {
    left: 20,
    borderColor: COLORS.error,
    transform: [{ rotate: '-15deg' }],
  },
  superlikeOverlay: {
    alignSelf: 'center',
    borderColor: COLORS.accent,
  },
  overlayText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  tagsContainer: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(147, 51, 234, 0.3)',
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontSize: 12,
    color: COLORS.primaryLight,
    fontWeight: '500',
  },
  actionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.lg,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  dislikeButton: {
    borderColor: COLORS.error,
  },
  superlikeButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: COLORS.accent,
  },
  likeButton: {
    borderColor: COLORS.success,
  },
  skipButton: {
    alignItems: 'center',
    paddingBottom: SPACING.lg,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
});
