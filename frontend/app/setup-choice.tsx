import React from 'react';
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

const { width } = Dimensions.get('window');

export default function SetupChoiceScreen() {
  const { setOnboardingComplete } = useAppStore();

  const handleExpressSetup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setOnboardingComplete(true);
    router.replace('/(tabs)/discover');
  };

  const handleFullSetup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/body-analysis');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.iconWrapper}>
            <Ionicons name="sparkles" size={40} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>Nice choices!</Text>
          <Text style={styles.subtitle}>
            We're learning your style already.
          </Text>
          <Text style={styles.question}>What's next?</Text>
        </View>

        <View style={styles.optionsContainer}>
          {/* Express Setup */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleExpressSetup}
            activeOpacity={0.8}
          >
            <View style={styles.optionHeader}>
              <View style={styles.optionIcon}>
                <Ionicons name="flash" size={24} color={COLORS.accent} />
              </View>
              <Text style={styles.optionTitle}>Express Setup</Text>
            </View>
            <Text style={styles.optionDescription}>
              Start exploring now, add wardrobe later
            </Text>
            <View style={styles.timeEstimate}>
              <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.timeText}>~2 minutes</Text>
            </View>
          </TouchableOpacity>

          {/* Full Setup */}
          <TouchableOpacity
            style={[styles.optionCard, styles.recommendedCard]}
            onPress={handleFullSetup}
            activeOpacity={0.8}
          >
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>RECOMMENDED</Text>
            </View>
            <View style={styles.optionHeader}>
              <View style={[styles.optionIcon, styles.recommendedIcon]}>
                <Ionicons name="sparkles" size={24} color={COLORS.primary} />
              </View>
              <Text style={styles.optionTitle}>Full Setup</Text>
            </View>
            <Text style={styles.optionDescription}>
              Selfie analysis + wardrobe upload for best results
            </Text>
            <View style={styles.timeEstimate}>
              <Ionicons name="time-outline" size={16} color={COLORS.textMuted} />
              <Text style={styles.timeText}>~8 minutes</Text>
            </View>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  question: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  },
  recommendedCard: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(147, 51, 234, 0.08)',
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recommendedIcon: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  optionDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
    marginLeft: 60,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 60,
  },
  timeText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
});
