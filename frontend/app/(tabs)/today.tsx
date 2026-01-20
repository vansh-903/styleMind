import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../../src/constants/api';
import { format } from 'date-fns';

const OCCASIONS = [
  { id: 'work', label: 'Work', icon: 'briefcase' },
  { id: 'casual', label: 'Casual', icon: 'home' },
  { id: 'date', label: 'Date', icon: 'heart' },
  { id: 'party', label: 'Party', icon: 'sparkles' },
];

export default function TodayScreen() {
  const [weather, setWeather] = useState<any>(null);
  const [selectedOccasion, setSelectedOccasion] = useState('casual');
  const [outfit, setOutfit] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [outfitError, setOutfitError] = useState<string | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const { userId, wardrobeItems } = useAppStore();

  const today = new Date();
  const dayName = format(today, 'EEEE');
  const dateStr = format(today, 'MMM d, yyyy');

  useEffect(() => {
    fetchWeather();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchOutfitSuggestion();
    }
  }, [userId, fetchOutfitSuggestion]);

  const fetchWeather = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      let lat = 19.0760;
      let lon = 72.8777;
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        lat = location.coords.latitude;
        lon = location.coords.longitude;
      }
      
      const response = await axios.get(API_ENDPOINTS.getWeather, {
        params: { lat, lon }
      });
      setWeather(response.data);
    } catch (error) {
      console.error('Error fetching weather:', error);
      setWeather({ temperature: 28, condition: 'Partly Cloudy', location: 'Your Location' });
    } finally {
      setWeatherLoading(false);
    }
  };

  const fetchOutfitSuggestion = useCallback(async () => {
    setLoading(true);
    setOutfitError(null);
    try {
      const response = await axios.post(API_ENDPOINTS.getOutfitSuggestion, {
        user_id: userId,
        occasion: selectedOccasion,
        weather: weather,
      });
      setOutfit(response.data);
    } catch (error) {
      console.error('Error fetching outfit:', error);
      setOutfitError('Failed to generate outfit. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedOccasion, weather]);

  const handleOccasionSelect = (occasionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOccasion(occasionId);
  };

  const handleRefresh = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    fetchOutfitSuggestion();
  };

  const handleWearThis = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Outfit Saved!',
      'Great choice! This outfit has been saved to your history.',
      [{ text: 'OK' }]
    );
  };

  const getWeatherIcon = () => {
    if (!weather) return 'partly-sunny';
    const condition = weather.condition?.toLowerCase() || '';
    if (condition.includes('rain')) return 'rainy';
    if (condition.includes('cloud')) return 'partly-sunny';
    if (condition.includes('clear') || condition.includes('sunny')) return 'sunny';
    if (condition.includes('storm')) return 'thunderstorm';
    return 'partly-sunny';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Today</Text>
            <Text style={styles.subtitle}>{dayName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.chatButton}
              onPress={() => router.push('/chat')}
            >
              <Ionicons name="chatbubble-ellipses" size={22} color={COLORS.primary} />
            </TouchableOpacity>
            <Text style={styles.date}>{dateStr}</Text>
          </View>
        </View>

        {/* Weather Card */}
        <View style={styles.weatherCard}>
          {weatherLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <View style={styles.weatherMain}>
                <Ionicons name={getWeatherIcon()} size={32} color={COLORS.accent} />
                <Text style={styles.temperature}>{weather?.temperature || '--'}°C</Text>
              </View>
              <View>
                <Text style={styles.weatherCondition}>{weather?.condition || 'Loading...'}</Text>
                <Text style={styles.weatherLocation}>{weather?.location || 'Your Location'}</Text>
              </View>
            </>
          )}
        </View>

        {/* Occasion Selector */}
        <Text style={styles.sectionTitle}>What's the occasion?</Text>
        <View style={styles.occasionGrid}>
          {OCCASIONS.map((occasion) => (
            <TouchableOpacity
              key={occasion.id}
              style={[
                styles.occasionCard,
                selectedOccasion === occasion.id && styles.occasionCardActive
              ]}
              onPress={() => handleOccasionSelect(occasion.id)}
            >
              <Ionicons 
                name={occasion.icon as any} 
                size={24} 
                color={selectedOccasion === occasion.id ? COLORS.primary : COLORS.textSecondary} 
              />
              <Text style={[
                styles.occasionLabel,
                selectedOccasion === occasion.id && styles.occasionLabelActive
              ]}>
                {occasion.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Outfit Suggestion */}
        <View style={styles.outfitSection}>
          <View style={styles.outfitHeader}>
            <Text style={styles.sectionTitle}>Your Outfit for Today</Text>
            <TouchableOpacity onPress={handleRefresh} disabled={loading}>
              <Ionicons 
                name="refresh" 
                size={22} 
                color={loading ? COLORS.textMuted : COLORS.primary} 
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.outfitLoading}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Creating your perfect outfit...</Text>
            </View>
          ) : outfitError ? (
            <View style={styles.errorOutfit}>
              <Ionicons name="cloud-offline" size={48} color={COLORS.textMuted} />
              <Text style={styles.errorText}>{outfitError}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={fetchOutfitSuggestion}>
                <Ionicons name="refresh" size={18} color={COLORS.white} />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          ) : outfit?.success && outfit?.outfit?.length > 0 ? (
            <View style={styles.outfitCard}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {outfit.outfit.map((item: any, index: number) => (
                  <View key={index} style={styles.outfitItem}>
                    <Image 
                      source={{ uri: `data:image/jpeg;base64,${item.image_base64}` }} 
                      style={styles.outfitItemImage}
                    />
                    <Text style={styles.outfitItemType}>{item.type}</Text>
                    <Text style={styles.outfitItemName}>{item.name}</Text>
                  </View>
                ))}
              </ScrollView>
              
              <View style={styles.outfitActions}>
                <TouchableOpacity style={styles.wearButton} onPress={handleWearThis}>
                  <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                  <Text style={styles.wearButtonText}>Wear This</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.tryOnButton}
                  onPress={() => {
                    const itemIds = outfit.outfit.map((item: any) => item.id).join(',');
                    router.push({ pathname: '/virtual-try-on', params: { itemIds } });
                  }}
                >
                  <Ionicons name="sparkles" size={20} color={COLORS.accent} />
                  <Text style={styles.tryOnButtonText}>Try On</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.shuffleButton} onPress={handleRefresh}>
                <Ionicons name="shuffle" size={18} color={COLORS.textSecondary} />
                <Text style={styles.shuffleButtonText}>Shuffle Outfit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.emptyOutfit}>
              <Ionicons name="shirt-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>
                {wardrobeItems.length === 0 
                  ? 'Add items to your wardrobe to get outfit suggestions'
                  : 'No outfit suggestions available'}
              </Text>
              {wardrobeItems.length === 0 && (
                <TouchableOpacity 
                  style={styles.addItemsButton}
                  onPress={() => router.push('/add-item')}
                >
                  <Text style={styles.addItemsText}>Add Items</Text>
                  <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                </TouchableOpacity>
              )}
            </View>
          )}
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
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  chatButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  date: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  weatherCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  weatherMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  temperature: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  weatherCondition: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  weatherLocation: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  occasionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  occasionCard: {
    width: '48%',
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  occasionCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
  },
  occasionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  occasionLabelActive: {
    color: COLORS.primary,
  },
  outfitSection: {
    marginTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  outfitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingRight: SPACING.lg,
  },
  outfitCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  outfitItem: {
    marginRight: SPACING.md,
    alignItems: 'center',
  },
  outfitItemImage: {
    width: 100,
    height: 130,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
  },
  outfitItemType: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.sm,
  },
  outfitItemName: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  outfitActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  wearButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  wearButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
  tryOnButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  tryOnButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.sm,
  },
  shuffleButtonText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  outfitLoading: {
    alignItems: 'center',
    padding: SPACING.xxl,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
  },
  emptyOutfit: {
    alignItems: 'center',
    padding: SPACING.xxl,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  emptyText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  addItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  addItemsText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  errorOutfit: {
    alignItems: 'center',
    padding: SPACING.xxl,
    marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  errorText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
