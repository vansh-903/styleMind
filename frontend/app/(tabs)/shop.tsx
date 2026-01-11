import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { COLORS, SPACING, RADIUS } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/appStore';
import axios from 'axios';
import { API_ENDPOINTS } from '../../src/constants/api';

export default function ShopScreen() {
  const [products, setProducts] = useState<any[]>([]);
  const [gaps, setGaps] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([500, 10000]);
  const { userId } = useAppStore();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [productsRes, gapsRes] = await Promise.all([
        axios.get(API_ENDPOINTS.getProducts, {
          params: { min_price: priceRange[0], max_price: priceRange[1] }
        }),
        userId ? axios.get(API_ENDPOINTS.getWardrobeGaps(userId)) : Promise.resolve({ data: { gaps: [] } })
      ]);
      
      setProducts(productsRes.data);
      setGaps(gapsRes.data.gaps || []);
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = (productId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setWishlist(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  const handleShopNow = (url: string) => {
    Linking.openURL(url);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return COLORS.error;
      case 'medium': return COLORS.accent;
      default: return COLORS.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Shop Smart</Text>
          <TouchableOpacity style={styles.wishlistButton}>
            <Ionicons name="heart" size={22} color={COLORS.error} />
            {wishlist.size > 0 && (
              <View style={styles.wishlistBadge}>
                <Text style={styles.wishlistBadgeText}>{wishlist.size}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Wardrobe Gaps Card */}
        {gaps.length > 0 && (
          <View style={styles.gapsCard}>
            <View style={styles.gapsHeader}>
              <Ionicons name="bulb" size={24} color={COLORS.accent} />
              <Text style={styles.gapsTitle}>Wardrobe Gaps</Text>
            </View>
            <Text style={styles.gapsSubtitle}>Items we recommend based on your wardrobe:</Text>
            {gaps.map((gap, index) => (
              <View key={index} style={styles.gapItem}>
                <View style={[styles.gapDot, { backgroundColor: getPriorityColor(gap.priority) }]} />
                <View style={styles.gapInfo}>
                  <Text style={styles.gapName}>{gap.item}</Text>
                  <Text style={styles.gapReason}>{gap.reason}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Products Section */}
        <Text style={styles.sectionTitle}>Recommended for You</Text>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {products.map((product) => (
              <View key={product.id} style={styles.productCard}>
                <TouchableOpacity 
                  style={styles.productImageContainer}
                  onPress={() => handleShopNow(product.shop_url)}
                >
                  <Image source={{ uri: product.image_url }} style={styles.productImage} />
                  <View style={styles.matchBadge}>
                    <Text style={styles.matchText}>{Math.round(product.match_score * 100)}% match</Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.wishlistIcon}
                  onPress={() => toggleWishlist(product.id)}
                >
                  <Ionicons 
                    name={wishlist.has(product.id) ? 'heart' : 'heart-outline'} 
                    size={20} 
                    color={wishlist.has(product.id) ? COLORS.error : COLORS.textSecondary} 
                  />
                </TouchableOpacity>

                <View style={styles.productInfo}>
                  <Text style={styles.productBrand}>{product.brand}</Text>
                  <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                  <Text style={styles.productPrice}>₹{product.price.toLocaleString()}</Text>
                </View>

                <TouchableOpacity 
                  style={styles.shopButton}
                  onPress={() => handleShopNow(product.shop_url)}
                >
                  <Text style={styles.shopButtonText}>Shop Now</Text>
                  <Ionicons name="open-outline" size={14} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
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
  wishlistButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishlistBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.white,
  },
  gapsCard: {
    marginHorizontal: SPACING.lg,
    padding: SPACING.lg,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  gapsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  gapsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  gapsSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  gapItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  gapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  gapInfo: {
    flex: 1,
  },
  gapName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  gapReason: {
    fontSize: 12,
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
  loadingContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  productCard: {
    width: '50%',
    padding: SPACING.sm,
  },
  productImageContainer: {
    width: '100%',
    aspectRatio: 0.8,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  matchBadge: {
    position: 'absolute',
    bottom: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  matchText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.success,
  },
  wishlistIcon: {
    position: 'absolute',
    top: SPACING.md,
    right: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    paddingTop: SPACING.sm,
  },
  productBrand: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  shopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  shopButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
