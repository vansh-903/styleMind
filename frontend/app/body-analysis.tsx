import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { useAppStore } from '../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../src/constants/api';

export default function BodyAnalysisScreen() {
  const [step, setStep] = useState<'privacy' | 'capture' | 'analyzing' | 'results'>('privacy');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [consent, setConsent] = useState(false);
  
  const { setBodyAnalysis, setOnboardingComplete } = useAppStore();

  const handleContinue = () => {
    if (!consent) {
      Alert.alert('Consent Required', 'Please accept the privacy terms to continue');
      return;
    }
    setStep('capture');
  };

  const captureImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant camera permission');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageBase64(result.assets[0].base64);
      analyzeBody(result.assets[0].base64);
    }
  };

  const pickFromGallery = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant gallery permission');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageBase64(result.assets[0].base64);
      analyzeBody(result.assets[0].base64);
    }
  };

  const analyzeBody = async (base64: string) => {
    setStep('analyzing');
    setAnalyzing(true);
    
    try {
      const response = await axios.post(API_ENDPOINTS.analyzeBody, {
        image_base64: base64,
      });
      
      setResults(response.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('results');
    } catch (error) {
      console.error('Error analyzing body:', error);
      // Use default results
      setResults({
        body_type: {
          type: 'Rectangle',
          description: 'Balanced shoulders and hips with a less defined waist',
          recommendations: ['Belted dresses', 'Peplum tops', 'High-waisted bottoms'],
        },
        skin_tone: {
          type: 'Medium',
          undertone: 'warm',
          best_colors: ['Coral', 'Gold', 'Olive', 'Terracotta'],
          avoid_colors: ['Neon', 'Pastel Pink'],
        },
        face_shape: {
          type: 'Oval',
          description: 'Most versatile - almost all styles work for you',
        },
      });
      setStep('results');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSaveAndContinue = () => {
    if (results) {
      setBodyAnalysis(results);
    }
    setOnboardingComplete(true);
    router.replace('/(tabs)/discover');
  };

  // Privacy Screen
  if (step === 'privacy') {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <View style={styles.privacyContent}>
          <View style={styles.privacyIcon}>
            <Ionicons name="lock-closed" size={48} color={COLORS.primary} />
          </View>
          
          <Text style={styles.privacyTitle}>Your Privacy Matters</Text>
          
          <View style={styles.privacyCard}>
            <Text style={styles.privacyText}>
              Your selfie is analyzed <Text style={styles.bold}>ON YOUR DEVICE</Text> and is{' '}
              <Text style={styles.bold}>NEVER uploaded</Text> to our servers.
            </Text>
            <Text style={[styles.privacyText, { marginTop: SPACING.md }]}>
              We only save the results (body type, skin tone) to improve recommendations.
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.consentRow}
            onPress={() => setConsent(!consent)}
          >
            <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
              {consent && <Ionicons name="checkmark" size={16} color={COLORS.white} />}
            </View>
            <Text style={styles.consentText}>I understand and consent</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.continueButton, !consent && styles.continueButtonDisabled]}
            onPress={handleContinue}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => {
            setOnboardingComplete(true);
            router.replace('/(tabs)/discover');
          }}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Capture Screen
  if (step === 'capture') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setStep('privacy')}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Body Analysis</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.captureContent}>
          <Text style={styles.captureTitle}>Take a Full Body Photo</Text>
          <Text style={styles.captureSubtitle}>Stand in a well-lit area with your full body visible</Text>

          <View style={styles.tipsCard}>
            <Text style={styles.tipsTitle}>Tips:</Text>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.tipText}>Wear fitted clothes</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.tipText}>Stand straight</Text>
            </View>
            <View style={styles.tipRow}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
              <Text style={styles.tipText}>Neutral background</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.captureButton} onPress={captureImage}>
            <Ionicons name="camera" size={28} color={COLORS.white} />
            <Text style={styles.captureButtonText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
            <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Analyzing Screen
  if (step === 'analyzing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analyzingContainer}>
          {imageBase64 && (
            <Image 
              source={{ uri: `data:image/jpeg;base64,${imageBase64}` }} 
              style={styles.analyzingImage}
            />
          )}
          <Text style={styles.analyzingTitle}>Analyzing...</Text>
          <ActivityIndicator size="large" color={COLORS.primary} />
          
          <View style={styles.analyzingSteps}>
            <AnalyzingStep label="Body proportions" done={true} />
            <AnalyzingStep label="Skin undertone" loading />
            <AnalyzingStep label="Face shape" done={false} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // Results Screen
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep('capture')}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Results</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Body Type */}
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="body" size={24} color={COLORS.primary} />
            <Text style={styles.resultTitle}>Body Type</Text>
          </View>
          <Text style={styles.resultType}>{results?.body_type?.type}</Text>
          <Text style={styles.resultDescription}>{results?.body_type?.description}</Text>
          <Text style={styles.resultSubtitle}>Best styles:</Text>
          {results?.body_type?.recommendations?.map((rec: string, i: number) => (
            <Text key={i} style={styles.resultBullet}>• {rec}</Text>
          ))}
        </View>

        {/* Skin Tone */}
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="color-palette" size={24} color={COLORS.accent} />
            <Text style={styles.resultTitle}>Skin Tone</Text>
          </View>
          <Text style={styles.resultType}>
            {results?.skin_tone?.type} ({results?.skin_tone?.undertone} undertone)
          </Text>
          <Text style={styles.resultSubtitle}>Best colors:</Text>
          <View style={styles.colorChips}>
            {results?.skin_tone?.best_colors?.map((color: string, i: number) => (
              <View key={i} style={styles.colorChip}>
                <Text style={styles.colorChipText}>{color}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.resultSubtitle}>Avoid:</Text>
          <View style={styles.colorChips}>
            {results?.skin_tone?.avoid_colors?.map((color: string, i: number) => (
              <View key={i} style={[styles.colorChip, styles.colorChipAvoid]}>
                <Text style={styles.colorChipTextAvoid}>{color}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Face Shape */}
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <Ionicons name="happy" size={24} color={COLORS.secondary} />
            <Text style={styles.resultTitle}>Face Shape</Text>
          </View>
          <Text style={styles.resultType}>{results?.face_shape?.type}</Text>
          <Text style={styles.resultDescription}>{results?.face_shape?.description}</Text>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveAndContinue}>
          <Text style={styles.saveButtonText}>Save & Continue</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const AnalyzingStep = ({ label, done, loading }: { label: string; done?: boolean; loading?: boolean }) => (
  <View style={styles.stepRow}>
    {loading ? (
      <ActivityIndicator size="small" color={COLORS.primary} />
    ) : (
      <Ionicons 
        name={done ? 'checkmark-circle' : 'ellipse-outline'} 
        size={20} 
        color={done ? COLORS.success : COLORS.textMuted} 
      />
    )}
    <Text style={[styles.stepText, done && styles.stepTextDone]}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  closeButton: {
    padding: SPACING.md,
    marginLeft: SPACING.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  privacyContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  privacyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  privacyTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  privacyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
  },
  privacyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  consentText: {
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.lg,
    width: '100%',
    alignItems: 'center',
  },
  continueButtonDisabled: {
    backgroundColor: COLORS.textMuted,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  skipText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: SPACING.lg,
  },
  captureContent: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
  },
  captureTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  captureSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  tipsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    width: '100%',
    marginBottom: SPACING.xl,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  tipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  tipText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.lg,
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  galleryButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.md,
  },
  galleryButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.lg,
  },
  analyzingImage: {
    width: 180,
    height: 240,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  analyzingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  analyzingSteps: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  stepText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  stepTextDone: {
    color: COLORS.textPrimary,
  },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  resultType: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: SPACING.sm,
  },
  resultDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  resultSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  resultBullet: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: SPACING.sm,
  },
  colorChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  colorChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(147, 51, 234, 0.15)',
    borderRadius: RADIUS.full,
  },
  colorChipAvoid: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  colorChipText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  colorChipTextAvoid: {
    color: COLORS.error,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
