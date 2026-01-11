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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../../src/constants/api';

const { width, height } = Dimensions.get('window');
const SWIPE_THRESHOLD = 100;

export default function DiscoverScreen() {
  const [outfits, setOutfits] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const position = useRef(new Animated.ValueXY()).current;
  const { userId, gender, swipesCount, incrementSwipes, updateStyleDNA } = useAppStore();

  useEffect(() => {
    fetchOutfits();
  }, [gender]);

  const fetchOutfits = async () => {
    try {
      // Pass gender to get gender-appropriate outfits
      const response = await axios.get(API_ENDPOINTS.getOutfits, {
        params: { gender: gender || undefined }
      });
      setOutfits(response.data);
    } catch (error) {
      console.error('Error fetching outfits:', error);
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

  const handleSwipe = useCallback(async (action: 'like' | 'dislike' | 'superlike') => {
    if (!currentOutfit) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    updateStyleDNA(currentOutfit.style_category, action);
    incrementSwipes();
    
    if (userId) {
      try {
        await axios.post(API_ENDPOINTS.createSwipe, {
          user_id: userId,
          outfit_id: currentOutfit.id,
          action: action,
          style_category: currentOutfit.style_category,
        });
      } catch (error) {
        console.error('Error recording swipe:', error);
      }
    }
    
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
      setCurrentIndex(prev => prev + 1);
    });
  }, [currentIndex, currentOutfit, userId]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({ x: gesture.dx, y: gesture.dy });
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
      },
    })
  ).current;

  const progress = Math.min(swipesCount, 20);
  const isPersonalized = swipesCount >= 20;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading styles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (currentIndex >= outfits.length) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Ionicons name="checkmark-circle" size={64} color={COLORS.success} />
          <Text style={styles.emptyTitle}>All caught up!</Text>
          <Text style={styles.emptySubtitle}>Check back tomorrow for fresh styles</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover</Text>
        <TouchableOpacity style={styles.filterButton}>
          <Ionicons name="options" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {!isPersonalized && (
        <View style={styles.progressSection}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(progress / 20) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {progress}/20 • Personalizing your feed...
          </Text>
        </View>
      )}

      {isPersonalized && (
        <View style={styles.personalizedBadge}>
          <Ionicons name="sparkles" size={16} color={COLORS.primary} />
          <Text style={styles.personalizedText}>Feed personalized!</Text>
        </View>
      )}

      <View style={styles.cardsContainer}>
        {nextOutfit && (
          <View style={[styles.card, styles.nextCard]}>
            <Image source={{ uri: nextOutfit.image_url }} style={styles.cardImage} />
          </View>
        )}

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
            
            <Animated.View style={[styles.overlay, styles.likeOverlay, { opacity: likeOpacity }]}>
              <Text style={styles.overlayText}>LIKE</Text>
            </Animated.View>
            <Animated.View style={[styles.overlay, styles.dislikeOverlay, { opacity: dislikeOpacity }]}>
              <Text style={styles.overlayText}>NOPE</Text>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  progressBar: {
    height: 4,
    backgroundColor: COLORS.surface,
    borderRadius: 2,
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  personalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
  },
  personalizedText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
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
    flexWrap: 'wrap',
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
    paddingVertical: SPACING.md,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  emptySubtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
});
