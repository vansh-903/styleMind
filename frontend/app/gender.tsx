import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { useAppStore } from '../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../src/constants/api';

const { width } = Dimensions.get('window');

const genderOptions = [
  {
    id: 'female',
    label: 'Women',
    icon: 'woman',
    description: "Women's fashion & styles",
  },
  {
    id: 'male',
    label: 'Men',
    icon: 'man',
    description: "Men's fashion & styles",
  },
  {
    id: 'non-binary',
    label: 'Non-Binary',
    icon: 'people',
    description: 'All styles, no boundaries',
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
      }, 500);
    } catch (error) {
      console.error('Error creating user:', error);
      // Still allow navigation even if API fails
      setGender(genderId);
      setTimeout(() => {
        router.push('/swipe-learning');
      }, 500);
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
        <Text style={styles.title}>How do you{"\n"}identify?</Text>
        <Text style={styles.subtitle}>
          This helps us show you relevant styles
        </Text>

        <View style={styles.optionsContainer}>
          {genderOptions.map((option, index) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                selected === option.id && styles.optionCardSelected,
              ]}
              onPress={() => handleSelect(option.id)}
              activeOpacity={0.8}
              disabled={isLoading}
            >
              <View style={styles.optionContent}>
                <View
                  style={[
                    styles.iconWrapper,
                    selected === option.id && styles.iconWrapperSelected,
                  ]}
                >
                  <Ionicons
                    name={option.icon as any}
                    size={32}
                    color={selected === option.id ? COLORS.primary : COLORS.textSecondary}
                  />
                </View>
                <Text
                  style={[
                    styles.optionLabel,
                    selected === option.id && styles.optionLabelSelected,
                  ]}
                >
                  {option.label}
                </Text>
                <Text style={styles.optionDescription}>{option.description}</Text>
              </View>
              {selected === option.id && (
                <View style={styles.checkmark}>
                  <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                </View>
              )}
            </TouchableOpacity>
          ))}
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
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    lineHeight: 44,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  optionsContainer: {
    gap: SPACING.md,
  },
  optionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 2,
    borderColor: 'transparent',
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
  },
  optionContent: {
    flex: 1,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  iconWrapperSelected: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
  },
  optionLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  optionLabelSelected: {
    color: COLORS.primary,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  checkmark: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
  },
});
