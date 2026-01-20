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
  TextInput,
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

const CATEGORIES = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];
const PATTERNS = ['Solid', 'Striped', 'Floral', 'Plaid', 'Abstract', 'Printed'];
const OCCASIONS = ['Casual', 'Work', 'Party', 'Date', 'Formal', 'Sport'];
const COLORS_LIST = [
  { name: 'Black', color: '#000000' },
  { name: 'White', color: '#FFFFFF' },
  { name: 'Navy', color: '#000080' },
  { name: 'Red', color: '#FF0000' },
  { name: 'Blue', color: '#0000FF' },
  { name: 'Green', color: '#008000' },
  { name: 'Pink', color: '#FFC0CB' },
  { name: 'Yellow', color: '#FFFF00' },
  { name: 'Brown', color: '#8B4513' },
  { name: 'Grey', color: '#808080' },
];

export default function AddItemScreen() {
  const [step, setStep] = useState<'select' | 'analyzing' | 'confirm'>('select');
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [pattern, setPattern] = useState('');
  const [selectedOccasions, setSelectedOccasions] = useState<string[]>([]);
  const [brand, setBrand] = useState('');
  
  const { userId, addWardrobeItem } = useAppStore();

  const pickImage = async (useCamera: boolean) => {
    const permission = useCamera 
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant permission to access your photos');
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
          base64: true,
        });

    if (!result.canceled && result.assets[0].base64) {
      setImageBase64(result.assets[0].base64);
      analyzeImage(result.assets[0].base64);
    }
  };

  const analyzeImage = async (base64: string) => {
    setStep('analyzing');
    setAnalyzing(true);
    
    try {
      const response = await axios.post(API_ENDPOINTS.analyzeClothing, {
        image_base64: base64,
      });
      
      const analysis = response.data;
      setCategory(analysis.category || 'Tops');
      setSubcategory(analysis.subcategory || '');
      setSelectedColors(analysis.colors || []);
      setPattern(analysis.pattern || 'Solid');
      setSelectedOccasions(analysis.occasions || []);
      
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep('confirm');
    } catch (error) {
      console.error('Error analyzing image:', error);
      // Set defaults and continue
      setCategory('Tops');
      setPattern('Solid');
      setSelectedOccasions(['Casual']);
      setStep('confirm');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleColor = (colorName: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColors(prev => 
      prev.includes(colorName) 
        ? prev.filter(c => c !== colorName)
        : [...prev, colorName]
    );
  };

  const toggleOccasion = (occasion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedOccasions(prev => 
      prev.includes(occasion) 
        ? prev.filter(o => o !== occasion)
        : [...prev, occasion]
    );
  };

  const handleSave = async () => {
    if (!imageBase64 || !userId) return;
    
    setSaving(true);
    try {
      const response = await axios.post(API_ENDPOINTS.createWardrobeItem, {
        user_id: userId,
        image_base64: imageBase64,
        category,
        subcategory,
        colors: selectedColors,
        pattern,
        occasions: selectedOccasions,
        brand: brand || null,
      });
      
      addWardrobeItem(response.data);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (step === 'select') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={28} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Item</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.selectContainer}>
          <TouchableOpacity 
            style={styles.selectCard}
            onPress={() => pickImage(true)}
          >
            <View style={styles.selectIcon}>
              <Ionicons name="camera" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.selectTitle}>Take Photo</Text>
            <Text style={styles.selectSubtitle}>Capture your clothing item</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.selectCard}
            onPress={() => pickImage(false)}
          >
            <View style={styles.selectIcon}>
              <Ionicons name="images" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.selectTitle}>Choose from Gallery</Text>
            <Text style={styles.selectSubtitle}>Select an existing photo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (step === 'analyzing') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.analyzingContainer}>
          {imageBase64 && (
            <Image 
              source={{ uri: `data:image/jpeg;base64,${imageBase64}` }} 
              style={styles.previewImage}
            />
          )}
          <View style={styles.analyzingContent}>
            <Text style={styles.analyzingTitle}>Analyzing...</Text>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <View style={styles.analyzingSteps}>
              <AnalyzingStep label="Category" done={true} />
              <AnalyzingStep label="Color" done={!analyzing} loading={analyzing} />
              <AnalyzingStep label="Pattern" done={false} />
              <AnalyzingStep label="Occasion" done={false} />
            </View>
          </View>
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
        <Text style={styles.headerTitle}>Add Item</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          <Text style={[styles.saveText, saving && styles.saveTextDisabled]}>
            {saving ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Preview Image */}
        {imageBase64 && (
          <View style={styles.imagePreviewContainer}>
            <Image 
              source={{ uri: `data:image/jpeg;base64,${imageBase64}` }} 
              style={styles.confirmImage}
            />
          </View>
        )}

        <View style={styles.form}>
          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pillsRow}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pill, category === cat && styles.pillActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.pillText, category === cat && styles.pillTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Subcategory */}
          <Text style={styles.label}>Subcategory</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., T-Shirt, Jeans, Sneakers"
            placeholderTextColor={COLORS.textMuted}
            value={subcategory}
            onChangeText={setSubcategory}
          />

          {/* Colors */}
          <Text style={styles.label}>Color</Text>
          <View style={styles.colorsGrid}>
            {COLORS_LIST.map((c) => (
              <TouchableOpacity
                key={c.name}
                style={[
                  styles.colorCircle,
                  { backgroundColor: c.color },
                  selectedColors.includes(c.name) && styles.colorSelected,
                  c.name === 'White' && styles.colorWhiteBorder,
                ]}
                onPress={() => toggleColor(c.name)}
              >
                {selectedColors.includes(c.name) && (
                  <Ionicons 
                    name="checkmark" 
                    size={16} 
                    color={c.name === 'White' || c.name === 'Yellow' ? '#000' : '#FFF'} 
                  />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Pattern */}
          <Text style={styles.label}>Pattern</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.pillsRow}>
              {PATTERNS.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.pill, pattern === p && styles.pillActive]}
                  onPress={() => setPattern(p)}
                >
                  <Text style={[styles.pillText, pattern === p && styles.pillTextActive]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Occasions */}
          <Text style={styles.label}>Occasions</Text>
          <View style={styles.occasionsGrid}>
            {OCCASIONS.map((occ) => (
              <TouchableOpacity
                key={occ}
                style={[
                  styles.occasionChip,
                  selectedOccasions.includes(occ) && styles.occasionChipActive,
                ]}
                onPress={() => toggleOccasion(occ)}
              >
                <Text style={[
                  styles.occasionText,
                  selectedOccasions.includes(occ) && styles.occasionTextActive,
                ]}>
                  {occ}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Brand */}
          <Text style={styles.label}>Brand (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter brand name"
            placeholderTextColor={COLORS.textMuted}
            value={brand}
            onChangeText={setBrand}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Add to Wardrobe</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const AnalyzingStep = ({ label, done, loading }: { label: string; done: boolean; loading?: boolean }) => (
  <View style={styles.analyzingStep}>
    {loading ? (
      <ActivityIndicator size="small" color={COLORS.primary} />
    ) : (
      <Ionicons 
        name={done ? 'checkmark-circle' : 'ellipse-outline'} 
        size={20} 
        color={done ? COLORS.success : COLORS.textMuted} 
      />
    )}
    <Text style={[styles.analyzingStepText, done && styles.analyzingStepDone]}>
      {label}
    </Text>
  </View>
);

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
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
  },
  saveTextDisabled: {
    color: COLORS.textMuted,
  },
  selectContainer: {
    flex: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  selectCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  selectIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(147, 51, 234, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  selectTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  selectSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  analyzingContainer: {
    flex: 1,
    alignItems: 'center',
    padding: SPACING.lg,
  },
  previewImage: {
    width: 200,
    height: 260,
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
  },
  analyzingContent: {
    alignItems: 'center',
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
  analyzingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  analyzingStepText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  analyzingStepDone: {
    color: COLORS.textPrimary,
  },
  imagePreviewContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.lg,
  },
  confirmImage: {
    width: 160,
    height: 200,
    borderRadius: RADIUS.lg,
  },
  form: {
    padding: SPACING.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.md,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  pillActive: {
    backgroundColor: COLORS.primary,
  },
  pillText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  pillTextActive: {
    color: COLORS.white,
    fontWeight: '500',
  },
  colorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSelected: {
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  colorWhiteBorder: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  occasionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  occasionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
  },
  occasionChipActive: {
    backgroundColor: 'rgba(147, 51, 234, 0.2)',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  occasionText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  occasionTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  saveButton: {
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xl,
    backgroundColor: COLORS.primary,
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
