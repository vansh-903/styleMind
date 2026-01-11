// API configuration - use relative URLs since Kubernetes routing handles /api prefix
export const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
  // Users
  createUser: `${API_BASE_URL}/users`,
  getUser: (id: string) => `${API_BASE_URL}/users/${id}`,
  updateUser: (id: string) => `${API_BASE_URL}/users/${id}`,
  
  // Wardrobe
  createWardrobeItem: `${API_BASE_URL}/wardrobe`,
  getWardrobe: (userId: string) => `${API_BASE_URL}/wardrobe/${userId}`,
  getWardrobeItem: (itemId: string) => `${API_BASE_URL}/wardrobe/item/${itemId}`,
  updateWardrobeItem: (itemId: string) => `${API_BASE_URL}/wardrobe/${itemId}`,
  deleteWardrobeItem: (itemId: string) => `${API_BASE_URL}/wardrobe/${itemId}`,
  
  // Swipes
  createSwipe: `${API_BASE_URL}/swipes`,
  getSwipes: (userId: string) => `${API_BASE_URL}/swipes/${userId}`,
  
  // Outfits
  getOutfits: `${API_BASE_URL}/outfits`,
  getOutfit: (id: string) => `${API_BASE_URL}/outfits/${id}`,
  
  // AI Analysis
  analyzeClothing: `${API_BASE_URL}/analyze-clothing`,
  analyzeBody: `${API_BASE_URL}/analyze-body`,
  
  // Weather
  getWeather: `${API_BASE_URL}/weather`,
  
  // Outfit Suggestions
  getOutfitSuggestion: `${API_BASE_URL}/outfit-suggestion`,
  
  // Products
  getProducts: `${API_BASE_URL}/products`,
  getWardrobeGaps: (userId: string) => `${API_BASE_URL}/wardrobe-gaps/${userId}`,
};
