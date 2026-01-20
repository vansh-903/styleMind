import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { useAppStore } from '../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../src/constants/api';

const { width } = Dimensions.get('window');
const ITEM_SIZE = (width - 48 - 24) / 4;

const OCCASIONS = [
  { id: 'casual', label: 'Casual', icon: 'home' },
  { id: 'work', label: 'Work', icon: 'briefcase' },
  { id: 'date', label: 'Date', icon: 'heart' },
  { id: 'party', label: 'Party', icon: 'sparkles' },
];

export default function VirtualTryOnScreen() {
  const params = useLocalSearchParams();
  const preSelectedIds = params.itemIds ? String(params.itemIds).split(',') : [];

  const [selectedItems, setSelectedItems] = useState<string[]>(preSelectedIds);
  const [occasion, setOccasion] = useState('casual');
  const [loading, setLoading] = useState(false);
  const [wardrobeLoading, setWardrobeLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [wardrobeItems, setWardrobeItems] = useState<any[]>([]);
  const { userId } = useAppStore();

  const fetchWardrobe = useCallback(async () => {
    if (!userId) {
      setWardrobeLoading(false);
      return;
    }
    try {
      const response = await axios.get(API_ENDPOINTS.getWardrobe(userId));
      setWardrobeItems(response.data);
    } catch (error) {
      console.error('Error fetching wardrobe:', error);
    } finally {
      setWardrobeLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWardrobe();
  }, [fetchWardrobe]);

  const toggleItemSelection = (itemId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
    setResult(null); // Clear previous result when selection changes
  };

  const handleTryOn = async () => {
    if (selectedItems.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setLoading(true);
    setResult(null);

    try {
      const response = await axios.post(API_ENDPOINTS.virtualTryOn, {
        user_id: userId,
        item_ids: selectedItems,
        occasion: occasion,
      });
      setResult(response.data);
    } catch (error) {
      console.error('Error with virtual try-on:', error);
      setResult({
        success: false,
        message: 'Failed to generate visualization. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const getSelectedItemsData = () => {
    return wardrobeItems.filter(item => selectedItems.includes(item.id));
  };

  const getFitScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 60) return '#F59E0B';
    return '#EF4444';
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Virtual Try-On</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Selected Items Preview */}
        {selectedItems.length > 0 && (
          <View style={styles.selectedPreview}>
            <Text style={styles.sectionTitle}>Selected Items ({selectedItems.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {getSelectedItemsData().map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.selectedItem}
                  onPress={() => toggleItemSelection(item.id)}
                >
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                    style={styles.selectedItemImage}
                  />
                  <View style={styles.removeButton}>
                    <Ionicons name="close" size={12} color={COLORS.white} />
                  </View>
                  <Text style={styles.selectedItemCategory}>{item.category}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Occasion Selector */}
        <View style={styles.occasionSection}>
          <Text style={styles.sectionTitle}>Occasion</Text>
          <View style={styles.occasionGrid}>
            {OCCASIONS.map((occ) => (
              <TouchableOpacity
                key={occ.id}
                style={[
                  styles.occasionPill,
                  occasion === occ.id && styles.occasionPillActive
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOccasion(occ.id);
                  setResult(null);
                }}
              >
                <Ionicons
                  name={occ.icon as any}
                  size={16}
                  color={occasion === occ.id ? COLORS.white : COLORS.textSecondary}
                />
                <Text style={[
                  styles.occasionText,
                  occasion === occ.id && styles.occasionTextActive
                ]}>
                  {occ.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Try On Button */}
        <TouchableOpacity
          style={[styles.tryOnButton, selectedItems.length === 0 && styles.tryOnButtonDisabled]}
          onPress={handleTryOn}
          disabled={selectedItems.length === 0 || loading}
        >
          <LinearGradient
            colors={selectedItems.length > 0 ? ['#9333EA', '#7C3AED'] : ['#4B5563', '#374151']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.tryOnGradient}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color={COLORS.white} />
                <Text style={styles.tryOnText}>
                  {selectedItems.length === 0 ? 'Select Items to Try On' : 'Generate AI Visualization'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>

        {/* Result Section */}
        {result && result.success && (
          <View style={styles.resultSection}>
            {/* Fit Score */}
            <View style={styles.scoreCard}>
              <View style={styles.scoreHeader}>
                <Text style={styles.scoreTitle}>Fit Score</Text>
                <View style={[styles.scoreBadge, { backgroundColor: getFitScoreColor(result.fit_score) }]}>
                  <Text style={styles.scoreValue}>{result.fit_score}%</Text>
                </View>
              </View>
              <Text style={styles.colorHarmony}>{result.color_harmony}</Text>
            </View>

            {/* Visualization */}
            <View style={styles.visualizationCard}>
              <Ionicons name="eye" size={24} color={COLORS.primary} />
              <Text style={styles.visualizationText}>{result.visualization}</Text>
            </View>

            {/* Body Flattery */}
            {result.body_flattery && (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="body" size={20} color={COLORS.accent} />
                  <Text style={styles.infoTitle}>Body Flattery</Text>
                </View>
                <Text style={styles.infoText}>{result.body_flattery}</Text>
              </View>
            )}

            {/* Occasion Verdict */}
            {result.occasion_verdict && (
              <View style={styles.infoCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                  <Text style={styles.infoTitle}>Occasion Verdict</Text>
                </View>
                <Text style={styles.infoText}>{result.occasion_verdict}</Text>
              </View>
            )}

            {/* Styling Tips */}
            {result.styling_tips && result.styling_tips.length > 0 && (
              <View style={styles.tipsCard}>
                <View style={styles.infoHeader}>
                  <Ionicons name="bulb" size={20} color="#F59E0B" />
                  <Text style={styles.infoTitle}>Styling Tips</Text>
                </View>
                {result.styling_tips.map((tip: string, index: number) => (
                  <View key={index} style={styles.tipRow}>
                    <Text style={styles.tipBullet}>{index + 1}.</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Confidence Boost */}
            {result.confidence_boost && (
              <View style={styles.confidenceCard}>
                <Text style={styles.confidenceText}>{result.confidence_boost}</Text>
              </View>
            )}
          </View>
        )}

        {/* Error State */}
        {result && !result.success && (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle" size={32} color={COLORS.error} />
            <Text style={styles.errorText}>{result.message}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleTryOn}>
              <Text style={styles.retryText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Wardrobe Selection */}
        <View style={styles.wardrobeSection}>
          <Text style={styles.sectionTitle}>Select from Wardrobe</Text>
          {wardrobeLoading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: SPACING.lg }} />
          ) : wardrobeItems.length === 0 ? (
            <View style={styles.emptyWardrobe}>
              <Ionicons name="shirt-outline" size={40} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No items in wardrobe</Text>
              <TouchableOpacity
                style={styles.addItemButton}
                onPress={() => router.push('/add-item')}
              >
                <Text style={styles.addItemText}>Add Items</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.wardrobeGrid}>
              {wardrobeItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.wardrobeItem,
                    selectedItems.includes(item.id) && styles.wardrobeItemSelected
                  ]}
                  onPress={() => toggleItemSelection(item.id)}
                >
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }}
                    style={styles.wardrobeItemImage}
                  />
                  {selectedItems.includes(item.id) && (
                    <View style={styles.checkmark}>
                      <Ionicons name="checkmark" size={16} color={COLORS.white} />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  selectedPreview: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  selectedItem: {
    marginRight: SPACING.md,
    alignItems: 'center',
  },
  selectedItemImage: {
    width: 70,
    height: 90,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  removeButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedItemCategory: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  occasionSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
  },
  occasionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  occasionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
  },
  occasionPillActive: {
    backgroundColor: COLORS.primary,
  },
  occasionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  occasionTextActive: {
    color: COLORS.white,
  },
  tryOnButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
  tryOnButtonDisabled: {
    opacity: 0.6,
  },
  tryOnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  tryOnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  resultSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    gap: SPACING.md,
  },
  scoreCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  scoreHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  scoreTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scoreBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  scoreValue: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.white,
  },
  colorHarmony: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  visualizationCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.md,
  },
  visualizationText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  tipsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
  },
  tipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  tipBullet: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    width: 20,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  confidenceCard: {
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  confidenceText: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  errorCard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.md,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  wardrobeSection: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  wardrobeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  wardrobeItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE * 1.3,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  wardrobeItemSelected: {
    borderColor: COLORS.primary,
  },
  wardrobeItemImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  checkmark: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWardrobe: {
    alignItems: 'center',
    padding: SPACING.xl,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    gap: SPACING.sm,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  addItemButton: {
    marginTop: SPACING.sm,
  },
  addItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
