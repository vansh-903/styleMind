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
  Modal,
  ScrollView,
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

const STYLE_FILTERS = [
  { id: 'all', label: 'All Styles' },
  { id: 'minimalist', label: 'Minimalist' },
  { id: 'casual_chic', label: 'Casual Chic' },
  { id: 'streetwear', label: 'Streetwear' },
  { id: 'bohemian', label: 'Bohemian' },
  { id: 'classic', label: 'Classic' },
  { id: 'edgy', label: 'Edgy' },
];

export default function DiscoverScreen() {
  const [outfits, setOutfits] = useState<any[]>([]);
  const [filteredOutfits, setFilteredOutfits] = useState<any[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const position = useRef(new Animated.ValueXY()).current;
  const { userId, gender, swipesCount, incrementSwipes, updateStyleDNA } = useAppStore();
  const handleSwipeRef = useRef<(action: 'like' | 'dislike' | 'superlike') => void>(() => {});

  useEffect(() => {
    fetchOutfits();
  }, [gender]);

  useEffect(() => {
    // Apply filter when outfits or filter changes
    if (selectedFilter === 'all') {
      setFilteredOutfits(outfits);
    } else {
      setFilteredOutfits(outfits.filter(o => o.style_category === selectedFilter));
    }
    setCurrentIndex(0);
  }, [outfits, selectedFilter]);

  const fetchOutfits = async () => {
    setLoading(true);
    setError(null);
    try {
      // Pass gender to get gender-appropriate outfits
      const response = await axios.get(API_ENDPOINTS.getOutfits, {
        params: { gender: gender || undefined }
      });
      setOutfits(response.data);
    } catch (err) {
      console.error('Error fetching outfits:', err);
      setError('Failed to load styles. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSelect = (filterId: string) => {
    setSelectedFilter(filterId);
    setShowFilter(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const currentOutfit = filteredOutfits[currentIndex];
  const nextOutfit = filteredOutfits[currentIndex + 1];

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
  }, [currentOutfit, userId, position, updateStyleDNA, incrementSwipes]);

  // Keep ref updated with latest handleSwipe
  useEffect(() => {
    handleSwipeRef.current = handleSwipe;
  }, [handleSwipe]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture if there's significant movement
        return Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5;
      },
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => {
        // Stop any ongoing animation when touch starts
        position.stopAnimation();
        position.setOffset({ x: 0, y: 0 });
        position.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: position.x, dy: position.y }],
        { useNativeDriver: false }
      ),
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

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="cloud-offline" size={64} color={COLORS.textMuted} />
          <Text style={styles.errorTitle}>Oops!</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOutfits}>
            <Ionicons name="refresh" size={20} color={COLORS.white} />
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (currentIndex >= filteredOutfits.length) {
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
        <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilter(true)}>
          <Ionicons name="options" size={22} color={selectedFilter !== 'all' ? COLORS.primary : COLORS.textPrimary} />
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

      {/* Filter Modal */}
      <Modal
        visible={showFilter}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilter(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowFilter(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Style</Text>
              <TouchableOpacity onPress={() => setShowFilter(false)}>
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterList}>
              {STYLE_FILTERS.map((filter) => (
                <TouchableOpacity
                  key={filter.id}
                  style={[
                    styles.filterOption,
                    selectedFilter === filter.id && styles.filterOptionActive
                  ]}
                  onPress={() => handleFilterSelect(filter.id)}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === filter.id && styles.filterOptionTextActive
                  ]}>
                    {filter.label}
                  </Text>
                  {selectedFilter === filter.id && (
                    <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.xl,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingBottom: SPACING.xxl,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  filterList: {
    paddingHorizontal: SPACING.lg,
  },
  filterOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterOptionActive: {
    backgroundColor: 'rgba(147, 51, 234, 0.05)',
  },
  filterOptionText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  filterOptionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
