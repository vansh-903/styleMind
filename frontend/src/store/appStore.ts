import { create } from 'zustand';

interface StyleDNA {
  minimalist: number;
  casual_chic: number;
  streetwear: number;
  bohemian: number;
  classic: number;
  edgy: number;
}

interface BodyAnalysis {
  body_type: {
    type: string;
    description: string;
    recommendations: string[];
  };
  skin_tone: {
    type: string;
    undertone: string;
    best_colors: string[];
    avoid_colors: string[];
  };
  face_shape: {
    type: string;
    description: string;
  };
}

interface WardrobeItem {
  id: string;
  user_id: string;
  image_base64: string;
  category: string;
  subcategory: string;
  colors: string[];
  pattern: string;
  occasions: string[];
  brand?: string;
  times_worn: number;
  last_worn?: string;
  favorite: boolean;
  created_at: string;
}

interface AppState {
  // User
  userId: string | null;
  userName: string;
  gender: string;
  onboardingComplete: boolean;
  swipesCount: number;
  styleDNA: StyleDNA;
  bodyAnalysis: BodyAnalysis | null;
  
  // Wardrobe
  wardrobeItems: WardrobeItem[];
  
  // Actions
  setUserId: (id: string) => void;
  setUserName: (name: string) => void;
  setGender: (gender: string) => void;
  setOnboardingComplete: (complete: boolean) => void;
  incrementSwipes: () => void;
  updateStyleDNA: (category: string, action: 'like' | 'dislike' | 'superlike') => void;
  setBodyAnalysis: (analysis: BodyAnalysis) => void;
  setWardrobeItems: (items: WardrobeItem[]) => void;
  addWardrobeItem: (item: WardrobeItem) => void;
  removeWardrobeItem: (id: string) => void;
  updateWardrobeItem: (id: string, updates: Partial<WardrobeItem>) => void;
  reset: () => void;
}

const initialStyleDNA: StyleDNA = {
  minimalist: 0,
  casual_chic: 0,
  streetwear: 0,
  bohemian: 0,
  classic: 0,
  edgy: 0,
};

export const useAppStore = create<AppState>()((set) => ({
  userId: null,
  userName: 'StyleMind User',
  gender: '',
  onboardingComplete: false,
  swipesCount: 0,
  styleDNA: initialStyleDNA,
  bodyAnalysis: null,
  wardrobeItems: [],

  setUserId: (id) => set({ userId: id }),
  setUserName: (name) => set({ userName: name }),
  setGender: (gender) => set({ gender }),
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  
  incrementSwipes: () => set((state) => ({ swipesCount: state.swipesCount + 1 })),
  
  updateStyleDNA: (category, action) => set((state) => {
    const newStyleDNA = { ...state.styleDNA };
    const key = category as keyof StyleDNA;
    if (key in newStyleDNA) {
      if (action === 'like') {
        newStyleDNA[key] = Math.min(1, newStyleDNA[key] + 0.05);
      } else if (action === 'superlike') {
        newStyleDNA[key] = Math.min(1, newStyleDNA[key] + 0.1);
      } else if (action === 'dislike') {
        newStyleDNA[key] = Math.max(0, newStyleDNA[key] - 0.03);
      }
    }
    return { styleDNA: newStyleDNA };
  }),
  
  setBodyAnalysis: (analysis) => set({ bodyAnalysis: analysis }),
  setWardrobeItems: (items) => set({ wardrobeItems: items }),
  addWardrobeItem: (item) => set((state) => ({ 
    wardrobeItems: [item, ...state.wardrobeItems] 
  })),
  removeWardrobeItem: (id) => set((state) => ({ 
    wardrobeItems: state.wardrobeItems.filter(item => item.id !== id) 
  })),
  updateWardrobeItem: (id, updates) => set((state) => ({
    wardrobeItems: state.wardrobeItems.map(item => 
      item.id === id ? { ...item, ...updates } : item
    )
  })),
  
  reset: () => set({
    userId: null,
    userName: 'StyleMind User',
    gender: '',
    onboardingComplete: false,
    swipesCount: 0,
    styleDNA: initialStyleDNA,
    bodyAnalysis: null,
    wardrobeItems: [],
  }),
}));
