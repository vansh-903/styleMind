from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import httpx
import base64

# Import Gemini service
from gemini_service import get_gemini_service, GeminiService
from chat_service import get_chat_service, ChatService

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# In-memory storage for prototype (no MongoDB needed)
# This simplifies deployment - data resets on restart
users_db: Dict[str, Dict] = {}
wardrobe_db: Dict[str, List[Dict]] = {}
swipes_db: Dict[str, List[Dict]] = {}

# Gemini API Key
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', os.environ.get('GOOGLE_AI_API_KEY', ''))

# Create the main app
app = FastAPI(title="StyleMind API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: Optional[str] = None
    name: str = "StyleMind User"
    username: str = ""
    gender: str = ""  # male, female, non-binary
    created_at: datetime = Field(default_factory=datetime.utcnow)
    profile_complete: bool = False
    onboarding_complete: bool = False
    swipes_count: int = 0
    body_analysis: Optional[Dict[str, Any]] = None
    style_dna: Dict[str, float] = Field(default_factory=lambda: {
        "minimalist": 0.0,
        "casual_chic": 0.0,
        "streetwear": 0.0,
        "bohemian": 0.0,
        "classic": 0.0,
        "edgy": 0.0
    })

class UserCreate(BaseModel):
    name: Optional[str] = "StyleMind User"
    email: Optional[str] = None
    gender: Optional[str] = None

class UserUpdate(BaseModel):
    name: Optional[str] = None
    gender: Optional[str] = None
    onboarding_complete: Optional[bool] = None
    profile_complete: Optional[bool] = None
    body_analysis: Optional[Dict[str, Any]] = None
    style_dna: Optional[Dict[str, float]] = None

class WardrobeItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    image_base64: str
    category: str  # Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories
    subcategory: str  # T-Shirt, Jeans, Sneakers, etc.
    colors: List[str] = []
    pattern: str = "Solid"  # Solid, Striped, Floral, etc.
    occasions: List[str] = []  # Casual, Work, Party, Date, Formal
    brand: Optional[str] = None
    times_worn: int = 0
    last_worn: Optional[datetime] = None
    favorite: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)

class WardrobeItemCreate(BaseModel):
    user_id: str
    image_base64: str
    category: Optional[str] = None
    subcategory: Optional[str] = None
    colors: Optional[List[str]] = None
    pattern: Optional[str] = None
    occasions: Optional[List[str]] = None
    brand: Optional[str] = None

class WardrobeItemUpdate(BaseModel):
    category: Optional[str] = None
    subcategory: Optional[str] = None
    colors: Optional[List[str]] = None
    pattern: Optional[str] = None
    occasions: Optional[List[str]] = None
    brand: Optional[str] = None
    times_worn: Optional[int] = None
    last_worn: Optional[datetime] = None
    favorite: Optional[bool] = None

class SwipeRecord(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    outfit_id: str
    action: str  # like, dislike, superlike
    style_category: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SwipeCreate(BaseModel):
    user_id: str
    outfit_id: str
    action: str
    style_category: str

class Outfit(BaseModel):
    id: str
    name: str
    image_url: str
    tags: List[str]
    style_category: str
    items: List[Dict[str, str]]

class AnalyzeClothingRequest(BaseModel):
    image_base64: str

class AnalyzeBodyRequest(BaseModel):
    image_base64: str

class OutfitSuggestionRequest(BaseModel):
    user_id: str
    occasion: str  # work, casual, date, party
    weather: Optional[Dict[str, Any]] = None

class ChatRequest(BaseModel):
    user_id: str
    message: str

class ChatResponse(BaseModel):
    success: bool
    response: str
    timestamp: Optional[str] = None
    message_count: Optional[int] = None
    error: Optional[str] = None

class VirtualTryOnRequest(BaseModel):
    user_id: str
    item_ids: List[str]  # List of wardrobe item IDs to try on
    occasion: Optional[str] = "casual"

# ==================== MOCK DATA ====================

# Women's Outfits
WOMEN_OUTFITS = [
    {
        "id": "w_outfit_001",
        "name": "Elegant Evening Dress",
        "image_url": "https://images.unsplash.com/photo-1624911104820-5316c700b907?w=600",
        "tags": ["Elegant", "Evening", "Sophisticated"],
        "style_category": "classic",
        "gender": "female",
        "items": [{"type": "dress", "name": "White Dress", "color": "White"}]
    },
    {
        "id": "w_outfit_002",
        "name": "Boho Chic Maxi",
        "image_url": "https://images.unsplash.com/photo-1622122201640-3b34a4a49444?w=600",
        "tags": ["Boho", "Floral", "Free-spirited"],
        "style_category": "bohemian",
        "gender": "female",
        "items": [{"type": "dress", "name": "Floral Maxi", "color": "Multi"}]
    },
    {
        "id": "w_outfit_003",
        "name": "Trendy Stripes",
        "image_url": "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600",
        "tags": ["Trendy", "Stripes", "Fun"],
        "style_category": "casual_chic",
        "gender": "female",
        "items": [{"type": "dress", "name": "Striped Dress", "color": "Multi"}]
    },
    {
        "id": "w_outfit_004",
        "name": "Chic Pink Look",
        "image_url": "https://images.unsplash.com/photo-1581044777550-4cfa60707c03?w=600",
        "tags": ["Chic", "Pink", "Feminine"],
        "style_category": "casual_chic",
        "gender": "female",
        "items": [{"type": "outfit", "name": "Pink Ensemble", "color": "Pink"}]
    },
    {
        "id": "w_outfit_005",
        "name": "Power Suit",
        "image_url": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600",
        "tags": ["Professional", "Power", "Chic"],
        "style_category": "classic",
        "gender": "female",
        "items": [{"type": "suit", "name": "Blazer Set", "color": "Black"}]
    },
    {
        "id": "w_outfit_006",
        "name": "Casual Denim",
        "image_url": "https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600",
        "tags": ["Casual", "Denim", "Relaxed"],
        "style_category": "casual_chic",
        "gender": "female",
        "items": [{"type": "top", "name": "White Top", "color": "White"}, {"type": "bottom", "name": "Jeans", "color": "Blue"}]
    },
    {
        "id": "w_outfit_007",
        "name": "Street Style Queen",
        "image_url": "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?w=600",
        "tags": ["Street", "Urban", "Bold"],
        "style_category": "streetwear",
        "gender": "female",
        "items": [{"type": "jacket", "name": "Oversized Jacket", "color": "Black"}]
    },
    {
        "id": "w_outfit_008",
        "name": "Minimalist Elegance",
        "image_url": "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?w=600",
        "tags": ["Minimal", "Clean", "Elegant"],
        "style_category": "minimalist",
        "gender": "female",
        "items": [{"type": "dress", "name": "Simple Dress", "color": "Beige"}]
    },
    {
        "id": "w_outfit_009",
        "name": "Party Ready",
        "image_url": "https://images.unsplash.com/photo-1496747611176-843222e1e57c?w=600",
        "tags": ["Party", "Glamorous", "Night Out"],
        "style_category": "edgy",
        "gender": "female",
        "items": [{"type": "dress", "name": "Cocktail Dress", "color": "Black"}]
    },
    {
        "id": "w_outfit_010",
        "name": "Summer Vibes",
        "image_url": "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600",
        "tags": ["Summer", "Light", "Fresh"],
        "style_category": "bohemian",
        "gender": "female",
        "items": [{"type": "dress", "name": "Sundress", "color": "Yellow"}]
    },
    {
        "id": "w_outfit_011",
        "name": "Office Chic",
        "image_url": "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=600",
        "tags": ["Work", "Professional", "Polished"],
        "style_category": "classic",
        "gender": "female",
        "items": [{"type": "blouse", "name": "Silk Blouse", "color": "White"}, {"type": "bottom", "name": "Pencil Skirt", "color": "Black"}]
    },
    {
        "id": "w_outfit_012",
        "name": "Athleisure Queen",
        "image_url": "https://images.unsplash.com/photo-1518459031867-a89b944bffe4?w=600",
        "tags": ["Sporty", "Casual", "Comfortable"],
        "style_category": "streetwear",
        "gender": "female",
        "items": [{"type": "set", "name": "Matching Set", "color": "Grey"}]
    }
]

# Men's Outfits
MEN_OUTFITS = [
    {
        "id": "m_outfit_001",
        "name": "Classic Casual",
        "image_url": "https://images.unsplash.com/photo-1617137968427-85924c800a22?w=600",
        "tags": ["Casual", "Classic", "Relaxed"],
        "style_category": "casual_chic",
        "gender": "male",
        "items": [{"type": "top", "name": "Polo Shirt", "color": "Navy"}, {"type": "bottom", "name": "Chinos", "color": "Khaki"}]
    },
    {
        "id": "m_outfit_002",
        "name": "Street Style King",
        "image_url": "https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600",
        "tags": ["Street", "Urban", "Bold"],
        "style_category": "streetwear",
        "gender": "male",
        "items": [{"type": "top", "name": "Graphic Tee", "color": "Black"}, {"type": "bottom", "name": "Joggers", "color": "Black"}]
    },
    {
        "id": "m_outfit_003",
        "name": "Business Professional",
        "image_url": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600",
        "tags": ["Professional", "Formal", "Sharp"],
        "style_category": "classic",
        "gender": "male",
        "items": [{"type": "suit", "name": "Navy Suit", "color": "Navy"}, {"type": "shirt", "name": "White Shirt", "color": "White"}]
    },
    {
        "id": "m_outfit_004",
        "name": "Smart Casual",
        "image_url": "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=600",
        "tags": ["Smart", "Casual", "Versatile"],
        "style_category": "classic",
        "gender": "male",
        "items": [{"type": "blazer", "name": "Casual Blazer", "color": "Grey"}, {"type": "bottom", "name": "Dark Jeans", "color": "Indigo"}]
    },
    {
        "id": "m_outfit_005",
        "name": "Minimalist Modern",
        "image_url": "https://images.unsplash.com/photo-1488161628813-04466f0bb4f5?w=600",
        "tags": ["Minimal", "Clean", "Modern"],
        "style_category": "minimalist",
        "gender": "male",
        "items": [{"type": "top", "name": "Basic Tee", "color": "White"}, {"type": "bottom", "name": "Black Jeans", "color": "Black"}]
    },
    {
        "id": "m_outfit_006",
        "name": "Weekend Vibes",
        "image_url": "https://images.unsplash.com/photo-1516257984-b1b4d707412e?w=600",
        "tags": ["Weekend", "Relaxed", "Comfortable"],
        "style_category": "casual_chic",
        "gender": "male",
        "items": [{"type": "top", "name": "Henley Shirt", "color": "Grey"}, {"type": "bottom", "name": "Shorts", "color": "Beige"}]
    },
    {
        "id": "m_outfit_007",
        "name": "Edgy Leather",
        "image_url": "https://images.unsplash.com/photo-1521341057461-6eb5f40b07ab?w=600",
        "tags": ["Edgy", "Cool", "Bold"],
        "style_category": "edgy",
        "gender": "male",
        "items": [{"type": "jacket", "name": "Leather Jacket", "color": "Black"}, {"type": "bottom", "name": "Slim Jeans", "color": "Black"}]
    },
    {
        "id": "m_outfit_008",
        "name": "Summer Linen",
        "image_url": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600",
        "tags": ["Summer", "Light", "Breathable"],
        "style_category": "bohemian",
        "gender": "male",
        "items": [{"type": "shirt", "name": "Linen Shirt", "color": "White"}, {"type": "bottom", "name": "Linen Pants", "color": "Beige"}]
    },
    {
        "id": "m_outfit_009",
        "name": "Sporty Athleisure",
        "image_url": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600",
        "tags": ["Sporty", "Active", "Modern"],
        "style_category": "streetwear",
        "gender": "male",
        "items": [{"type": "hoodie", "name": "Tech Hoodie", "color": "Grey"}, {"type": "bottom", "name": "Track Pants", "color": "Black"}]
    },
    {
        "id": "m_outfit_010",
        "name": "Denim on Denim",
        "image_url": "https://images.unsplash.com/photo-1495366691023-cc4eadcc2d7e?w=600",
        "tags": ["Denim", "Trendy", "Bold"],
        "style_category": "casual_chic",
        "gender": "male",
        "items": [{"type": "jacket", "name": "Denim Jacket", "color": "Blue"}, {"type": "bottom", "name": "Jeans", "color": "Blue"}]
    },
    {
        "id": "m_outfit_011",
        "name": "Indian Ethnic",
        "image_url": "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=600",
        "tags": ["Ethnic", "Traditional", "Festive"],
        "style_category": "classic",
        "gender": "male",
        "items": [{"type": "kurta", "name": "Designer Kurta", "color": "Cream"}]
    },
    {
        "id": "m_outfit_012",
        "name": "Date Night Ready",
        "image_url": "https://images.unsplash.com/photo-1480429370612-2e99c9a30f53?w=600",
        "tags": ["Date", "Stylish", "Sharp"],
        "style_category": "classic",
        "gender": "male",
        "items": [{"type": "shirt", "name": "Button Down", "color": "Light Blue"}, {"type": "bottom", "name": "Chinos", "color": "Navy"}]
    }
]

# Combined outfits - for non-binary users who see all styles
ALL_OUTFITS = WOMEN_OUTFITS + MEN_OUTFITS

# Legacy MOCK_OUTFITS for backward compatibility
MOCK_OUTFITS = ALL_OUTFITS

MOCK_PRODUCTS = [
    {"id": "prod_001", "name": "Classic White Sneakers", "brand": "Nike", "price": 4999, "image_url": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400", "category": "Shoes", "match_score": 0.94, "match_reason": "Matches 80% of your wardrobe", "shop_url": "https://nike.com"},
    {"id": "prod_002", "name": "Denim Jacket", "brand": "Levi's", "price": 3499, "image_url": "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=400", "category": "Outerwear", "match_score": 0.89, "match_reason": "Great for layering", "shop_url": "https://levis.com"},
    {"id": "prod_003", "name": "Crossbody Bag", "brand": "Coach", "price": 8999, "image_url": "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400", "category": "Accessories", "match_score": 0.85, "match_reason": "Completes your evening looks", "shop_url": "https://coach.com"},
    {"id": "prod_004", "name": "Slim Fit Chinos", "brand": "H&M", "price": 1999, "image_url": "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=400", "category": "Bottoms", "match_score": 0.92, "match_reason": "Versatile for work and casual", "shop_url": "https://hm.com"},
]

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "StyleMind API", "version": "1.0.0"}

# User Routes
@api_router.post("/users", response_model=User)
async def create_user(user_data: UserCreate):
    user = User(**user_data.dict())
    users_db[user.id] = user.dict()
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = users_db.get(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate):
    if user_id not in users_db:
        raise HTTPException(status_code=404, detail="User not found")
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    users_db[user_id].update(update_data)
    return User(**users_db[user_id])

# Wardrobe Routes
@api_router.post("/wardrobe", response_model=WardrobeItem)
async def create_wardrobe_item(item_data: WardrobeItemCreate):
    item = WardrobeItem(
        user_id=item_data.user_id,
        image_base64=item_data.image_base64,
        category=item_data.category or "Unknown",
        subcategory=item_data.subcategory or "Unknown",
        colors=item_data.colors or [],
        pattern=item_data.pattern or "Solid",
        occasions=item_data.occasions or [],
        brand=item_data.brand
    )
    if item_data.user_id not in wardrobe_db:
        wardrobe_db[item_data.user_id] = []
    wardrobe_db[item_data.user_id].append(item.dict())
    return item

@api_router.get("/wardrobe/{user_id}", response_model=List[WardrobeItem])
async def get_wardrobe(user_id: str, category: Optional[str] = None):
    items = wardrobe_db.get(user_id, [])
    if category and category != "All":
        items = [i for i in items if i.get("category") == category]
    return [WardrobeItem(**item) for item in items]

@api_router.get("/wardrobe/item/{item_id}", response_model=WardrobeItem)
async def get_wardrobe_item(item_id: str):
    for user_items in wardrobe_db.values():
        for item in user_items:
            if item.get("id") == item_id:
                return WardrobeItem(**item)
    raise HTTPException(status_code=404, detail="Item not found")

@api_router.put("/wardrobe/{item_id}", response_model=WardrobeItem)
async def update_wardrobe_item(item_id: str, item_update: WardrobeItemUpdate):
    update_data = {k: v for k, v in item_update.dict().items() if v is not None}
    for user_items in wardrobe_db.values():
        for item in user_items:
            if item.get("id") == item_id:
                item.update(update_data)
                return WardrobeItem(**item)
    raise HTTPException(status_code=404, detail="Item not found")

@api_router.delete("/wardrobe/{item_id}")
async def delete_wardrobe_item(item_id: str):
    for user_id, user_items in wardrobe_db.items():
        for i, item in enumerate(user_items):
            if item.get("id") == item_id:
                wardrobe_db[user_id].pop(i)
                return {"message": "Item deleted successfully"}
    raise HTTPException(status_code=404, detail="Item not found")

# Swipe Routes
@api_router.post("/swipes", response_model=SwipeRecord)
async def create_swipe(swipe_data: SwipeCreate):
    swipe = SwipeRecord(**swipe_data.dict())
    if swipe_data.user_id not in swipes_db:
        swipes_db[swipe_data.user_id] = []
    swipes_db[swipe_data.user_id].append(swipe.dict())

    # Update user's style DNA based on swipe
    user = users_db.get(swipe_data.user_id)
    if user:
        style_dna = user.get("style_dna", {})
        category = swipe_data.style_category
        if category in style_dna:
            if swipe_data.action == "like":
                style_dna[category] = min(1.0, style_dna[category] + 0.05)
            elif swipe_data.action == "superlike":
                style_dna[category] = min(1.0, style_dna[category] + 0.1)
            elif swipe_data.action == "dislike":
                style_dna[category] = max(0.0, style_dna[category] - 0.03)

        swipes_count = user.get("swipes_count", 0) + 1
        users_db[swipe_data.user_id]["style_dna"] = style_dna
        users_db[swipe_data.user_id]["swipes_count"] = swipes_count

    return swipe

@api_router.get("/swipes/{user_id}", response_model=List[SwipeRecord])
async def get_swipes(user_id: str):
    swipes = swipes_db.get(user_id, [])
    return [SwipeRecord(**swipe) for swipe in swipes]

# Outfits Routes
@api_router.get("/outfits")
async def get_outfits(skip: int = 0, limit: int = 20, gender: Optional[str] = None):
    """Get outfits filtered by gender. 
    - gender='male': returns men's outfits
    - gender='female': returns women's outfits  
    - gender='non-binary' or None: returns all outfits
    """
    if gender == "male":
        outfits = MEN_OUTFITS
    elif gender == "female":
        outfits = WOMEN_OUTFITS
    else:
        # For non-binary or when no gender specified, show all
        outfits = ALL_OUTFITS
    
    return outfits[skip:skip+limit]

@api_router.get("/outfits/{outfit_id}")
async def get_outfit(outfit_id: str):
    for outfit in ALL_OUTFITS:
        if outfit["id"] == outfit_id:
            return outfit
    raise HTTPException(status_code=404, detail="Outfit not found")

# AI Analysis Routes - Using Google Gemini
@api_router.post("/analyze-clothing")
async def analyze_clothing(request: AnalyzeClothingRequest):
    """Analyze clothing item using Gemini AI."""
    if not GEMINI_API_KEY:
        logger.warning("Gemini API key not configured, returning mock data")
        return {
            "category": "Tops",
            "subcategory": "T-Shirt",
            "colors": ["Unknown"],
            "pattern": "Solid",
            "occasions": ["Casual"],
            "confidence": 0.0,
            "error": "AI not configured - set GEMINI_API_KEY"
        }

    try:
        gemini = get_gemini_service(GEMINI_API_KEY)
        result = await gemini.analyze_clothing(request.image_base64)
        return result
    except Exception as e:
        logger.error(f"Error analyzing clothing: {str(e)}")
        return {
            "category": "Tops",
            "subcategory": "T-Shirt",
            "colors": ["Unknown"],
            "pattern": "Solid",
            "occasions": ["Casual"],
            "confidence": 0.0,
            "error": str(e)
        }


@api_router.post("/analyze-body")
async def analyze_body(request: AnalyzeBodyRequest):
    """Analyze body type, skin tone using Gemini AI."""
    logger.info(f"Body analysis request received, image size: {len(request.image_base64)} chars")
    logger.info(f"GEMINI_API_KEY configured: {bool(GEMINI_API_KEY)}, first 10 chars: {GEMINI_API_KEY[:10] if GEMINI_API_KEY else 'NONE'}...")

    if not GEMINI_API_KEY:
        logger.warning("Gemini API key not configured, returning mock data")
        return {
            "body_type": {
                "type": "Rectangle",
                "description": "Balanced proportions that suit many styles",
                "recommendations": ["Belted dresses", "Peplum tops", "High-waisted bottoms", "Layered looks"]
            },
            "skin_tone": {
                "type": "Medium",
                "undertone": "neutral",
                "best_colors": ["Navy Blue", "Emerald Green", "Burgundy", "Teal", "White"],
                "avoid_colors": ["Neon colors", "Washed-out pastels"]
            },
            "face_shape": {
                "type": "Oval",
                "description": "Versatile face shape that suits most styles",
                "flattering_necklines": ["V-neck", "Scoop neck", "Boat neck"],
                "flattering_accessories": ["Most earring styles", "Classic frames"]
            },
            "overall_recommendations": [
                "Configure GEMINI_API_KEY for personalized recommendations",
                "These are default suggestions"
            ],
            "error": "AI not configured - set GEMINI_API_KEY"
        }

    try:
        logger.info("Creating Gemini service...")
        gemini = get_gemini_service(GEMINI_API_KEY)
        logger.info("Calling Gemini analyze_body...")
        result = await gemini.analyze_body(request.image_base64)
        logger.info(f"Gemini returned: body_type={result.get('body_type', {}).get('type')}, confidence={result.get('confidence')}")
        return result
    except Exception as e:
        logger.error(f"Error analyzing body: {str(e)}", exc_info=True)
        return {
            "body_type": {
                "type": "Rectangle",
                "description": "Balanced proportions that work with many styles",
                "recommendations": ["Belted dresses to define waist", "Peplum tops", "High-waisted bottoms", "Layered outfits"]
            },
            "skin_tone": {
                "type": "Medium",
                "undertone": "warm",
                "best_colors": ["Coral", "Gold", "Olive Green", "Terracotta", "Teal"],
                "avoid_colors": ["Neon Yellow", "Washed-out Pastels"]
            },
            "face_shape": {
                "type": "Oval",
                "description": "Versatile face shape - most styles work well",
                "flattering_necklines": ["V-neck", "Scoop neck", "Boat neck"],
                "flattering_accessories": ["Most earring styles", "Classic frames"]
            },
            "overall_recommendations": [
                "Please try again with a clearer photo",
                "Good lighting helps with accurate analysis"
            ],
            "error": str(e)
        }

# ==================== CHAT ROUTES ====================

@api_router.post("/chat", response_model=ChatResponse)
async def chat_with_stylist(request: ChatRequest):
    """Chat with AI Fashion Stylist using LangChain."""
    if not GEMINI_API_KEY:
        return ChatResponse(
            success=False,
            response="AI stylist is not configured. Please set up the API key.",
            error="GEMINI_API_KEY not set"
        )

    try:
        # Get user data and wardrobe for context
        user_data = None
        wardrobe = None

        user = users_db.get(request.user_id)
        if user:
            user_data = user

        wardrobe_items = wardrobe_db.get(request.user_id, [])
        if wardrobe_items:
            wardrobe = wardrobe_items

        # Get chat service and send message
        chat_service = get_chat_service(GEMINI_API_KEY)
        result = await chat_service.chat(
            user_id=request.user_id,
            message=request.message,
            user_data=user_data,
            wardrobe=wardrobe
        )

        return ChatResponse(**result)

    except Exception as e:
        logger.error(f"Chat error: {str(e)}")
        return ChatResponse(
            success=False,
            response="I'm having trouble right now. Please try again! 💫",
            error=str(e)
        )

@api_router.delete("/chat/{user_id}")
async def clear_chat_history(user_id: str):
    """Clear chat history for a user."""
    try:
        if GEMINI_API_KEY:
            chat_service = get_chat_service(GEMINI_API_KEY)
            chat_service.clear_conversation(user_id)
        return {"success": True, "message": "Chat history cleared"}
    except Exception as e:
        logger.error(f"Clear chat error: {str(e)}")
        return {"success": False, "error": str(e)}

# Weather Route (using Open-Meteo - free, no API key needed)
@api_router.get("/weather")
async def get_weather(lat: float = 19.0760, lon: float = 72.8777):  # Default: Mumbai
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://api.open-meteo.com/v1/forecast",
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "current": "temperature_2m,relative_humidity_2m,weather_code",
                    "timezone": "auto"
                }
            )
            data = response.json()
            
            # Weather code to condition mapping
            weather_codes = {
                0: "Clear", 1: "Mainly Clear", 2: "Partly Cloudy", 3: "Overcast",
                45: "Foggy", 48: "Foggy", 51: "Light Drizzle", 53: "Drizzle",
                55: "Heavy Drizzle", 61: "Light Rain", 63: "Rain", 65: "Heavy Rain",
                71: "Light Snow", 73: "Snow", 75: "Heavy Snow", 80: "Light Showers",
                81: "Showers", 82: "Heavy Showers", 95: "Thunderstorm"
            }
            
            current = data.get("current", {})
            weather_code = current.get("weather_code", 0)
            
            return {
                "temperature": round(current.get("temperature_2m", 25)),
                "humidity": current.get("relative_humidity_2m", 50),
                "condition": weather_codes.get(weather_code, "Unknown"),
                "location": "Your Location",
                "icon": "partly-cloudy" if weather_code < 50 else "rainy" if weather_code < 80 else "stormy"
            }
    except Exception as e:
        logger.error(f"Weather API error: {str(e)}")
        return {
            "temperature": 28,
            "humidity": 65,
            "condition": "Partly Cloudy",
            "location": "Mumbai",
            "icon": "partly-cloudy"
        }

# Outfit Suggestion Route - Enhanced with Gemini AI
@api_router.post("/outfit-suggestion")
async def get_outfit_suggestion(request: OutfitSuggestionRequest):
    try:
        # Get user's wardrobe
        wardrobe_items = wardrobe_db.get(request.user_id, [])

        if not wardrobe_items:
            return {
                "success": False,
                "message": "Add items to your wardrobe to get outfit suggestions",
                "outfit": None
            }

        # Get user for style preferences
        user = users_db.get(request.user_id)
        style_dna = user.get("style_dna", {}) if user else {}
        body_analysis = user.get("body_analysis") if user else None

        # Try AI-powered suggestion if Gemini is configured
        if GEMINI_API_KEY:
            try:
                gemini = get_gemini_service(GEMINI_API_KEY)
                ai_result = await gemini.generate_outfit_suggestion(
                    wardrobe_items=wardrobe_items,
                    occasion=request.occasion,
                    style_preferences=style_dna,
                    weather=request.weather,
                    body_analysis=body_analysis
                )

                if ai_result.get("success") and ai_result.get("outfit"):
                    # Map AI suggestions back to wardrobe items with images
                    outfit_with_images = []
                    wardrobe_map = {item["id"]: item for item in wardrobe_items}

                    for ai_item in ai_result.get("outfit", []):
                        item_id = ai_item.get("id")
                        if item_id and item_id in wardrobe_map:
                            wardrobe_item = wardrobe_map[item_id]
                            outfit_with_images.append({
                                "id": item_id,
                                "type": ai_item.get("type", wardrobe_item.get("category")),
                                "name": ai_item.get("name", wardrobe_item.get("subcategory")),
                                "color": wardrobe_item["colors"][0] if wardrobe_item.get("colors") else "Unknown",
                                "image_base64": wardrobe_item.get("image_base64"),
                                "styling_note": ai_item.get("styling_note")
                            })

                    if outfit_with_images:
                        return {
                            "success": True,
                            "occasion": request.occasion,
                            "outfit": outfit_with_images,
                            "outfit_name": ai_result.get("outfit_name", "AI Curated Look"),
                            "styling_tips": ai_result.get("styling_tips", []),
                            "ai_powered": True
                        }
            except Exception as e:
                logger.warning(f"AI outfit suggestion failed, falling back: {e}")

        # Fallback: Simple outfit selection logic
        occasion_map = {
            "work": ["Work", "Formal"],
            "casual": ["Casual"],
            "date": ["Date", "Party"],
            "party": ["Party", "Date"]
        }
        target_occasions = occasion_map.get(request.occasion, ["Casual"])

        tops = [item for item in wardrobe_items if item.get("category") in ["Tops", "Dresses"]]
        bottoms = [item for item in wardrobe_items if item.get("category") == "Bottoms"]
        shoes = [item for item in wardrobe_items if item.get("category") == "Shoes"]

        outfit_items = []

        if tops:
            matching_tops = [t for t in tops if any(occ in t.get("occasions", []) for occ in target_occasions)]
            selected_top = matching_tops[0] if matching_tops else tops[0]
            outfit_items.append({
                "id": selected_top["id"],
                "type": selected_top["category"],
                "name": selected_top["subcategory"],
                "color": selected_top["colors"][0] if selected_top.get("colors") else "Unknown",
                "image_base64": selected_top["image_base64"]
            })

        if bottoms and tops and tops[0].get("category") != "Dresses":
            matching_bottoms = [b for b in bottoms if any(occ in b.get("occasions", []) for occ in target_occasions)]
            selected_bottom = matching_bottoms[0] if matching_bottoms else bottoms[0]
            outfit_items.append({
                "id": selected_bottom["id"],
                "type": "Bottoms",
                "name": selected_bottom["subcategory"],
                "color": selected_bottom["colors"][0] if selected_bottom.get("colors") else "Unknown",
                "image_base64": selected_bottom["image_base64"]
            })

        if shoes:
            selected_shoes = shoes[0]
            outfit_items.append({
                "id": selected_shoes["id"],
                "type": "Shoes",
                "name": selected_shoes["subcategory"],
                "color": selected_shoes["colors"][0] if selected_shoes.get("colors") else "Unknown",
                "image_base64": selected_shoes["image_base64"]
            })

        return {
            "success": True,
            "occasion": request.occasion,
            "outfit": outfit_items,
            "weather_note": f"Perfect for {request.weather.get('condition', 'today')}" if request.weather else None,
            "ai_powered": False
        }

    except Exception as e:
        logger.error(f"Outfit suggestion error: {str(e)}")
        return {
            "success": False,
            "message": str(e),
            "outfit": None
        }

# Virtual Try-On Route
@api_router.post("/virtual-try-on")
async def virtual_try_on(request: VirtualTryOnRequest):
    """Generate AI visualization of how selected outfit items would look on the user."""
    try:
        # Get user's wardrobe items
        user_wardrobe = wardrobe_db.get(request.user_id, [])
        if not user_wardrobe:
            return {
                "success": False,
                "message": "No wardrobe items found. Add items to your wardrobe first.",
                "visualization": None
            }

        # Find the selected items by ID
        selected_items = []
        wardrobe_map = {item["id"]: item for item in user_wardrobe}
        for item_id in request.item_ids:
            if item_id in wardrobe_map:
                selected_items.append(wardrobe_map[item_id])

        if not selected_items:
            return {
                "success": False,
                "message": "Selected items not found in your wardrobe.",
                "visualization": None
            }

        # Get user's body analysis
        user = users_db.get(request.user_id)
        body_analysis = user.get("body_analysis") if user else None

        # Generate visualization with Gemini
        if not GEMINI_API_KEY:
            return {
                "success": False,
                "message": "AI service not configured.",
                "visualization": None
            }

        gemini = get_gemini_service(GEMINI_API_KEY)
        result = await gemini.virtual_try_on(
            outfit_items=selected_items,
            body_analysis=body_analysis,
            occasion=request.occasion
        )

        # Add outfit info to result
        result["outfit_items"] = [
            {
                "id": item["id"],
                "category": item.get("category"),
                "subcategory": item.get("subcategory"),
                "colors": item.get("colors", []),
                "image_base64": item.get("image_base64")
            }
            for item in selected_items
        ]

        return result

    except Exception as e:
        logger.error(f"Virtual try-on error: {str(e)}")
        return {
            "success": False,
            "message": str(e),
            "visualization": None
        }

# Products Route
@api_router.get("/products")
async def get_products(min_price: int = 0, max_price: int = 100000):
    filtered = [p for p in MOCK_PRODUCTS if min_price <= p["price"] <= max_price]
    return filtered

@api_router.get("/wardrobe-gaps/{user_id}")
async def get_wardrobe_gaps(user_id: str):
    wardrobe_items = wardrobe_db.get(user_id, [])
    
    categories = {"Tops": 0, "Bottoms": 0, "Dresses": 0, "Outerwear": 0, "Shoes": 0, "Accessories": 0}
    for item in wardrobe_items:
        cat = item.get("category", "Unknown")
        if cat in categories:
            categories[cat] += 1
    
    gaps = []
    if categories["Shoes"] < 2:
        gaps.append({"item": "White Sneakers", "reason": "Versatile, matches most outfits", "priority": "high"})
    if categories["Outerwear"] < 1:
        gaps.append({"item": "Light Jacket", "reason": "Great for layering", "priority": "medium"})
    if categories["Accessories"] < 2:
        gaps.append({"item": "Statement Bag", "reason": "Elevates any outfit", "priority": "low"})
    if categories["Bottoms"] < 3:
        gaps.append({"item": "Versatile Chinos", "reason": "Works for work and casual", "priority": "medium"})
    
    return {"gaps": gaps, "category_counts": categories}

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    # In-memory storage - nothing to close
    logger.info("Shutting down StyleMind API")
