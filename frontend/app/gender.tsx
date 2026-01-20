import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { useAppStore } from '../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../src/constants/api';

const { width, height } = Dimensions.get('window');
const CARD_WIDTH = (width - SPACING.lg * 3) / 2;

const genderOptions = [
  {
    id: 'male',
    label: 'Male',
    icon: 'man',
    emoji: '👔',
    gradient: ['#4F46E5', '#7C3AED'],
    description: 'Explore men\'s fashion',
  },
  {
    id: 'female',
    label: 'Female',
    icon: 'woman',
    emoji: '👗',
    gradient: ['#EC4899', '#F43F5E'],
    description: 'Explore women\'s fashion',
  },
];

export default function GenderScreen() {
  const [selected, setSelected] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { setGender, setUserId } = useAppStore();

  const handleSelect = async (genderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelected(genderId);
    setIsLoading(true);

    try {
      // Create user in backend
      const response = await axios.post(API_ENDPOINTS.createUser, {
        gender: genderId,
      });

      setUserId(response.data.id);
      setGender(genderId);

      // Navigate after short delay
      setTimeout(() => {
        router.push('/swipe-learning');
      }, 600);
    } catch (error) {
      console.error('Error creating user:', error);
      // Still allow navigation even if API fails
      setGender(genderId);
      setTimeout(() => {
        router.push('/swipe-learning');
      }, 600);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Style</Text>
          <Text style={styles.subtitle}>
            Select your preference to personalize{'\n'}your fashion experience
          </Text>
        </View>

        <View style={styles.cardsContainer}>
          {genderOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.card,
                selected === option.id && styles.cardSelected,
              ]}
              onPress={() => handleSelect(option.id)}
              activeOpacity={0.85}
              disabled={isLoading}
            >
              <LinearGradient
                colors={selected === option.id ? option.gradient : ['#2D2D3A', '#1F1F28']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.emojiContainer}>
                  <Text style={styles.emoji}>{option.emoji}</Text>
                </View>

                <View style={styles.iconCircle}>
                  <Ionicons
                    name={option.icon as any}
                    size={48}
                    color={selected === option.id ? '#FFFFFF' : COLORS.textSecondary}
                  />
                </View>

                <Text style={[
                  styles.cardLabel,
                  selected === option.id && styles.cardLabelSelected
                ]}>
                  {option.label}
                </Text>

                <Text style={[
                  styles.cardDescription,
                  selected === option.id && styles.cardDescriptionSelected
                ]}>
                  {option.description}
                </Text>

                {selected === option.id && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.footerIcon}>
            <Ionicons name="sparkles" size={18} color={COLORS.primary} />
          </View>
          <Text style={styles.footerText}>
            Your choice helps us curate outfits tailored just for you
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  backButton: {
    padding: SPACING.md,
    marginLeft: SPACING.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl * 1.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  cardsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  card: {
    width: CARD_WIDTH,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  cardGradient: {
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    minHeight: 220,
    position: 'relative',
  },
  emojiContainer: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    opacity: 0.6,
  },
  emoji: {
    fontSize: 28,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  cardLabel: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cardLabelSelected: {
    color: '#FFFFFF',
  },
  cardDescription: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  cardDescriptionSelected: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  checkBadge: {
    position: 'absolute',
    top: SPACING.md,
    left: SPACING.md,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl * 1.5,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  footerIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flex: 1,
  },
});
