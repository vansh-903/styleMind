import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/appStore';

export default function ProfileScreen() {
  const { userName, styleDNA, wardrobeItems, swipesCount, reset } = useAppStore();

  const topStyles = Object.entries(styleDNA)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, value]) => ({ name: name.replace('_', ' '), value }));

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            reset();
            router.replace('/welcome');
          }
        },
      ]
    );
  };

  const menuItems = [
    { icon: 'camera', label: 'Update Body Analysis', onPress: () => router.push('/body-analysis') },
    { icon: 'help-circle', label: 'Style Quiz', onPress: () => {} },
    { icon: 'bar-chart', label: 'Wardrobe Insights', onPress: () => {} },
    { icon: 'people', label: 'Invite Friends', onPress: () => {} },
    { icon: 'help', label: 'Help & Support', onPress: () => {} },
    { icon: 'information-circle', label: 'About StyleMind', onPress: () => {} },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity 
            style={styles.settingsButton}
            onPress={() => {}}
          >
            <Ionicons name="settings-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Ionicons name="person" size={40} color={COLORS.textMuted} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName}</Text>
            <Text style={styles.profileMeta}>@style_user</Text>
            <Text style={styles.profileJoined}>Member since Jan 2025</Text>
          </View>
        </View>

        {/* Style DNA */}
        <View style={styles.styleDNACard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Style DNA</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See Full Analysis</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.cardSubtitle}>Your top styles:</Text>
          {topStyles.map((style, index) => (
            <View key={index} style={styles.styleRow}>
              <Text style={styles.styleName}>
                {style.name.charAt(0).toUpperCase() + style.name.slice(1)}
              </Text>
              <View style={styles.styleBarContainer}>
                <View style={[styles.styleBar, { width: `${style.value * 100}%` }]} />
              </View>
              <Text style={styles.stylePercent}>{Math.round(style.value * 100)}%</Text>
            </View>
          ))}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{wardrobeItems.length}</Text>
            <Text style={styles.statLabel}>Wardrobe</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{swipesCount}</Text>
            <Text style={styles.statLabel}>Swipes</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {wardrobeItems.length > 0 ? Math.round(Math.random() * 30 + 70) : 0}%
            </Text>
            <Text style={styles.statLabel}>Usage</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => (
            <TouchableOpacity 
              key={index} 
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Sign Out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Version 1.0.0</Text>
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.md,
  },
  avatarContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  profileMeta: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  profileJoined: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  styleDNACard: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  seeAllText: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '500',
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  styleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  styleName: {
    width: 100,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  styleBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 4,
    marginHorizontal: SPACING.sm,
  },
  styleBar: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  stylePercent: {
    width: 40,
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'right',
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  statCard: {
    flex: 1,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  menuContainer: {
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  signOutButton: {
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.error,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
});
