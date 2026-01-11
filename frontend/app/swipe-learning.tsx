import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Image,
  Animated,
  PanResponder,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import { useAppStore } from '../store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../constants/api';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

const OUTFITS = [
  { id: '1', name: 'Casual Summer Vibes', image: 'https://images.unsplash.com/photo-1523398002811-999ca8dec234?w=600', tags: ['Casual', 'Summer'], style: 'casual_chic' },
  { id: '2', name: 'Street Style Urban', image: 'https://images.unsplash.com/photo-1590330297626-d7aff25a0431?w=600', tags: ['Street', 'Urban'], style: 'streetwear' },
  { id: '3', name: 'Elegant Evening', image: 'https://images.unsplash.com/photo-1624911104820-5316c700b907?w=600', tags: ['Elegant', 'Evening'], style: 'classic' },
  { id: '4', name: 'Boho Chic', image: 'https://images.unsplash.com/photo-1622122201640-3b34a4a49444?w=600', tags: ['Boho', 'Floral'], style: 'bohemian' },
  { id: '5', name: 'Minimalist Modern', image: 'https://images.unsplash.com/photo-1624223237138-21a37e61dec0?w=600', tags: ['Minimal', 'Clean'], style: 'minimalist' },
  { id: '6', name: 'Edgy Rocker', image: 'https://images.pexels.com/photos/1895943/pexels-photo-1895943.jpeg?w=600', tags: ['Edgy', 'Bold'], style: 'edgy' },
  { id: '7', name: 'Traditional Ethnic', image: 'https://images.unsplash.com/photo-1739773375441-e8ded0ce3605?w=600', tags: ['Ethnic', 'Traditional'], style: 'classic' },
  { id: '8', name: 'Trendy Stripes', image: 'https://images.unsplash.com/photo-1739773375456-79be292cedb1?w=600', tags: ['Trendy', 'Fun'], style: 'casual_chic' },
  { id: '9', name: 'Chic Pink', image: 'https://images.unsplash.com/photo-1739773375403-36a4ba177f73?w=600', tags: ['Chic', 'Pink'], style: 'casual_chic' },
  { id: '10', name: 'Professional Smart', image: 'https://images.pexels.com/photos/923229/pexels-photo-923229.jpeg?w=600', tags: ['Professional', 'Smart'], style: 'classic' },
];

export default function SwipeLearningScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeDirection, setSwipeDirection] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;
  const { userId, incrementSwipes, updateStyleDNA } = useAppStore();

  const currentOutfit = OUTFITS[currentIndex];
  const nextOutfit = OUTFITS[currentIndex + 1];

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    const outfit = OUTFITS[currentIndex];
    
    // Update local state
    updateStyleDNA(outfit.style, action);
    incrementSwipes();
    
    // Send to backend
    if (userId) {
      try {
        await axios.post(API_ENDPOINTS.createSwipe, {
          user_id: userId,
          outfit_id: outfit.id,
          action: action,
          style_category: outfit.style,
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
      
      if (currentIndex >= OUTFITS.length - 1) {
        router.replace('/setup-choice');
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    });
  }, [currentIndex, userId]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
        
        if (gesture.dx > 50) setSwipeDirection('like');
        else if (gesture.dx < -50) setSwipeDirection('dislike');
        else if (gesture.dy < -50) setSwipeDirection('superlike');
        else setSwipeDirection(null);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          handleSwipe('like');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          handleSwipe('dislike');
        } else if (gesture.dy < -SWIPE_THRESHOLD) {
          handleSwipe('superlike');
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

  const progress = ((currentIndex) / OUTFITS.length) * 100;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Let's learn your style</Text>
        <Text style={styles.subtitle}>Swipe through {OUTFITS.length} outfits to get started</Text>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <Text style={styles.progressText}>{currentIndex}/{OUTFITS.length}</Text>
        </View>
      </View>

      <View style={styles.cardsContainer}>
        {/* Next Card (behind) */}
        {nextOutfit && (
          <View style={[styles.card, styles.nextCard]}>
            <Image source={{ uri: nextOutfit.image }} style={styles.cardImage} />
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
            <Image source={{ uri: currentOutfit.image }} style={styles.cardImage} />
            
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
                {currentOutfit.tags.map((tag, index) => (
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
});
