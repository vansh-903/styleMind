from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import httpx
import base64
from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'stylemind_db')]

# LLM API Key
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

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
    await db.users.insert_one(user.dict())
    return user

@api_router.get("/users/{user_id}", response_model=User)
async def get_user(user_id: str):
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_update: UserUpdate):
    update_data = {k: v for k, v in user_update.dict().items() if v is not None}
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return User(**user)

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
    await db.wardrobe.insert_one(item.dict())
    return item

@api_router.get("/wardrobe/{user_id}", response_model=List[WardrobeItem])
async def get_wardrobe(user_id: str, category: Optional[str] = None):
    query = {"user_id": user_id}
    if category and category != "All":
        query["category"] = category
    items = await db.wardrobe.find(query).to_list(1000)
    return [WardrobeItem(**item) for item in items]

@api_router.get("/wardrobe/item/{item_id}", response_model=WardrobeItem)
async def get_wardrobe_item(item_id: str):
    item = await db.wardrobe.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return WardrobeItem(**item)

@api_router.put("/wardrobe/{item_id}", response_model=WardrobeItem)
async def update_wardrobe_item(item_id: str, item_update: WardrobeItemUpdate):
    update_data = {k: v for k, v in item_update.dict().items() if v is not None}
    if update_data:
        await db.wardrobe.update_one({"id": item_id}, {"$set": update_data})
    item = await db.wardrobe.find_one({"id": item_id})
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return WardrobeItem(**item)

@api_router.delete("/wardrobe/{item_id}")
async def delete_wardrobe_item(item_id: str):
    result = await db.wardrobe.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

# Swipe Routes
@api_router.post("/swipes", response_model=SwipeRecord)
async def create_swipe(swipe_data: SwipeCreate):
    swipe = SwipeRecord(**swipe_data.dict())
    await db.swipes.insert_one(swipe.dict())
    
    # Update user's style DNA based on swipe
    user = await db.users.find_one({"id": swipe_data.user_id})
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
        await db.users.update_one(
            {"id": swipe_data.user_id},
            {"$set": {"style_dna": style_dna, "swipes_count": swipes_count}}
        )
    
    return swipe

@api_router.get("/swipes/{user_id}", response_model=List[SwipeRecord])
async def get_swipes(user_id: str):
    swipes = await db.swipes.find({"user_id": user_id}).to_list(1000)
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

# AI Analysis Routes
@api_router.post("/analyze-clothing")
async def analyze_clothing(request: AnalyzeClothingRequest):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"clothing_analysis_{uuid.uuid4()}",
            system_message="""You are a fashion AI expert. Analyze clothing items from images and provide structured data.
Respond ONLY with valid JSON in this exact format:
{
  "category": "Tops|Bottoms|Dresses|Outerwear|Shoes|Accessories",
  "subcategory": "specific type like T-Shirt, Jeans, Sneakers, etc.",
  "colors": ["primary color", "secondary color if any"],
  "pattern": "Solid|Striped|Floral|Plaid|Abstract|Printed",
  "occasions": ["Casual", "Work", "Party", "Date", "Formal", "Sport"],
  "confidence": 0.95
}"""
        ).with_model("openai", "gpt-4o")
        
        image_content = ImageContent(image_base64=request.image_base64)
        user_message = UserMessage(
            text="Analyze this clothing item and provide the category, subcategory, colors, pattern, and suitable occasions.",
            image_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        # Parse the JSON response
        import json
        # Clean the response - remove markdown code blocks if present
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        
        analysis = json.loads(clean_response.strip())
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing clothing: {str(e)}")
        # Return default analysis if AI fails
        return {
            "category": "Tops",
            "subcategory": "T-Shirt",
            "colors": ["Unknown"],
            "pattern": "Solid",
            "occasions": ["Casual"],
            "confidence": 0.5,
            "error": str(e)
        }

@api_router.post("/analyze-body")
async def analyze_body(request: AnalyzeBodyRequest):
    try:
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"body_analysis_{uuid.uuid4()}",
            system_message="""You are a fashion styling expert. Analyze body type and skin tone from selfie images to provide personalized fashion recommendations.
Respond ONLY with valid JSON in this exact format:
{
  "body_type": {
    "type": "Rectangle|Hourglass|Pear|Apple|Inverted Triangle",
    "description": "Brief description of the body type",
    "recommendations": ["style tip 1", "style tip 2", "style tip 3"]
  },
  "skin_tone": {
    "type": "Fair|Light|Medium|Tan|Deep",
    "undertone": "warm|cool|neutral",
    "best_colors": ["color1", "color2", "color3", "color4"],
    "avoid_colors": ["color1", "color2"]
  },
  "face_shape": {
    "type": "Oval|Round|Square|Heart|Oblong",
    "description": "Brief styling note"
  }
}"""
        ).with_model("openai", "gpt-4o")
        
        image_content = ImageContent(image_base64=request.image_base64)
        user_message = UserMessage(
            text="Analyze this person's body type, skin tone with undertone, and face shape. Provide fashion recommendations.",
            image_contents=[image_content]
        )
        
        response = await chat.send_message(user_message)
        
        import json
        clean_response = response.strip()
        if clean_response.startswith("```json"):
            clean_response = clean_response[7:]
        if clean_response.startswith("```"):
            clean_response = clean_response[3:]
        if clean_response.endswith("```"):
            clean_response = clean_response[:-3]
        
        analysis = json.loads(clean_response.strip())
        return analysis
        
    except Exception as e:
        logger.error(f"Error analyzing body: {str(e)}")
        return {
            "body_type": {
                "type": "Rectangle",
                "description": "Balanced proportions",
                "recommendations": ["Belted dresses", "Peplum tops", "High-waisted bottoms"]
            },
            "skin_tone": {
                "type": "Medium",
                "undertone": "warm",
                "best_colors": ["Coral", "Gold", "Olive", "Terracotta"],
                "avoid_colors": ["Neon", "Pastel Pink"]
            },
            "face_shape": {
                "type": "Oval",
                "description": "Versatile - most styles work well"
            },
            "error": str(e)
        }

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

# Outfit Suggestion Route
@api_router.post("/outfit-suggestion")
async def get_outfit_suggestion(request: OutfitSuggestionRequest):
    try:
        # Get user's wardrobe
        wardrobe_items = await db.wardrobe.find({"user_id": request.user_id}).to_list(100)
        
        if not wardrobe_items:
            return {
                "success": False,
                "message": "Add items to your wardrobe to get outfit suggestions",
                "outfit": None
            }
        
        # Filter by occasion
        occasion_map = {
            "work": ["Work", "Formal"],
            "casual": ["Casual"],
            "date": ["Date", "Party"],
            "party": ["Party", "Date"]
        }
        
        target_occasions = occasion_map.get(request.occasion, ["Casual"])
        
        # Simple outfit selection logic
        tops = [item for item in wardrobe_items if item.get("category") in ["Tops", "Dresses"]]
        bottoms = [item for item in wardrobe_items if item.get("category") == "Bottoms"]
        shoes = [item for item in wardrobe_items if item.get("category") == "Shoes"]
        
        outfit_items = []
        
        if tops:
            # Prefer items that match the occasion
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
            "weather_note": f"Perfect for {request.weather.get('condition', 'today')}" if request.weather else None
        }
        
    except Exception as e:
        logger.error(f"Outfit suggestion error: {str(e)}")
        return {
            "success": False,
            "message": str(e),
            "outfit": None
        }

# Products Route
@api_router.get("/products")
async def get_products(min_price: int = 0, max_price: int = 100000):
    filtered = [p for p in MOCK_PRODUCTS if min_price <= p["price"] <= max_price]
    return filtered

@api_router.get("/wardrobe-gaps/{user_id}")
async def get_wardrobe_gaps(user_id: str):
    wardrobe_items = await db.wardrobe.find({"user_id": user_id}).to_list(100)
    
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
    client.close()
