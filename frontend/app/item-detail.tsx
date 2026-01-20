import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { useAppStore } from '../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../src/constants/api';

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams();
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { removeWardrobeItem, updateWardrobeItem } = useAppStore();

  const fetchItem = useCallback(async () => {
    try {
      const response = await axios.get(API_ENDPOINTS.getWardrobeItem(id as string));
      setItem(response.data);
    } catch (error) {
      console.error('Error fetching item:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchItem();
  }, [fetchItem]);

  const handleToggleFavorite = async () => {
    if (!item) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await axios.put(API_ENDPOINTS.updateWardrobeItem(item.id), {
        favorite: !item.favorite,
      });
      setItem({ ...item, favorite: !item.favorite });
      updateWardrobeItem(item.id, { favorite: !item.favorite });
    } catch (error) {
      console.error('Error updating favorite:', error);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to remove this item from your wardrobe?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await axios.delete(API_ENDPOINTS.deleteWardrobeItem(item.id));
              removeWardrobeItem(item.id);
              router.back();
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        },
      ]
    );
  };

  const handleCreateOutfit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Coming Soon',
      'The outfit creator feature will be available in a future update. Stay tuned!',
      [{ text: 'OK' }]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.errorText}>Item not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleToggleFavorite}>
            <Ionicons 
              name={item.favorite ? 'heart' : 'heart-outline'} 
              size={24} 
              color={item.favorite ? COLORS.error : COLORS.textPrimary} 
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete}>
            <Ionicons name="trash-outline" size={24} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }} 
            style={styles.image}
          />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            {item.colors?.[0] || ''} {item.subcategory || item.category}
          </Text>
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.category}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{item.pattern}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Last worn</Text>
              <Text style={styles.statValue}>
                {item.last_worn 
                  ? new Date(item.last_worn).toLocaleDateString() 
                  : 'Never'}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Times worn</Text>
              <Text style={styles.statValue}>{item.times_worn} times</Text>
            </View>
          </View>

          {item.occasions?.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Occasions</Text>
              <View style={styles.occasionsRow}>
                {item.occasions.map((occ: string, i: number) => (
                  <View key={i} style={styles.occasionChip}>
                    <Text style={styles.occasionText}>{occ}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {item.brand && (
            <>
              <Text style={styles.sectionTitle}>Brand</Text>
              <Text style={styles.brandText}>{item.brand}</Text>
            </>
          )}

          <TouchableOpacity style={styles.createOutfitButton} onPress={handleCreateOutfit}>
            <Ionicons name="sparkles" size={20} color={COLORS.white} />
            <Text style={styles.createOutfitText}>Create Outfit with This</Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  imageContainer: {
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  image: {
    width: '100%',
    aspectRatio: 0.75,
    borderRadius: RADIUS.xl,
    backgroundColor: COLORS.surface,
  },
  content: {
    padding: SPACING.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
  },
  tagText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
  },
  statItem: {},
  statLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  occasionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  occasionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderRadius: RADIUS.full,
  },
  occasionText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  brandText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  createOutfitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.xl,
  },
  createOutfitText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
