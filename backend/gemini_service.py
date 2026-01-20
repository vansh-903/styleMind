# Gemini AI Service for StyleMind Fashion App
import base64
import json
import logging
from typing import Dict, Any, List, Optional

from google import genai
from google.genai import types
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ==================== RESPONSE SCHEMAS ====================

class ClothingAnalysisResult(BaseModel):
    """Structured response for clothing analysis."""
    category: str = Field(description="Main category: Tops, Bottoms, Dresses, Outerwear, Shoes, Accessories")
    subcategory: str = Field(description="Specific type like T-Shirt, Jeans, Sneakers")
    colors: List[str] = Field(description="List of colors, primary first")
    pattern: str = Field(description="Pattern type: Solid, Striped, Floral, Plaid, etc.")
    occasions: List[str] = Field(description="Suitable occasions: Casual, Work, Party, Date, Formal")
    style_tags: List[str] = Field(description="Style descriptors: minimalist, bohemian, streetwear, etc.")
    seasonality: List[str] = Field(description="Suitable seasons: Spring, Summer, Fall, Winter, All-Season")
    confidence: float = Field(description="Confidence score 0-1")


class BodyAnalysisResult(BaseModel):
    """Structured response for body analysis."""
    body_type: Dict[str, Any] = Field(description="Body type analysis with recommendations")
    skin_tone: Dict[str, Any] = Field(description="Skin tone and color recommendations")
    face_shape: Dict[str, Any] = Field(description="Face shape analysis")
    overall_recommendations: List[str] = Field(description="General style tips")
    confidence: float = Field(description="Confidence score 0-1")


class OutfitSuggestion(BaseModel):
    """Structured response for outfit suggestions."""
    outfit_name: str = Field(description="Creative name for the outfit")
    items: List[Dict[str, str]] = Field(description="List of items with id and styling note")
    occasion_fit: str = Field(description="Why this works for the occasion")
    styling_tips: List[str] = Field(description="How to wear this outfit")
    confidence: float = Field(description="Confidence score 0-1")


# ==================== GEMINI SERVICE ====================

class GeminiService:
    """
    AI service using Google Gemini for fashion analysis.
    Uses the new google.genai SDK.
    """

    def __init__(self, api_key: str):
        """Initialize with Gemini API key."""
        self.client = genai.Client(api_key=api_key)
        self.model_name = "gemini-2.0-flash"
        logger.info(f"GeminiService initialized with model: {self.model_name}")

    def _prepare_image(self, image_base64: str) -> types.Part:
        """Convert base64 image to Gemini Part format."""
        # Handle data URI format
        if image_base64.startswith("data:"):
            header, base64_data = image_base64.split(",", 1)
            mime_type = "image/jpeg"
            if "image/png" in header:
                mime_type = "image/png"
            elif "image/webp" in header:
                mime_type = "image/webp"
        else:
            base64_data = image_base64
            mime_type = "image/jpeg"

        image_bytes = base64.b64decode(base64_data)
        return types.Part.from_bytes(data=image_bytes, mime_type=mime_type)

    async def analyze_clothing(self, image_base64: str) -> Dict[str, Any]:
        """
        Analyze a clothing item from image.

        Returns category, colors, pattern, occasions, etc.
        """
        image_part = self._prepare_image(image_base64)

        prompt = """You are an expert fashion analyst. Analyze this clothing item image and provide detailed attributes.

CATEGORY GUIDELINES:
- Tops: T-shirts, shirts, blouses, kurtas, kurtis, crop tops, tank tops, sweaters, hoodies
- Bottoms: Jeans, trousers, pants, shorts, skirts, palazzos, salwars, leggings
- Dresses: One-piece dresses, gowns, jumpsuits, rompers, sarees, lehengas, anarkalis
- Outerwear: Jackets, coats, blazers, cardigans, shrugs, dupattas
- Shoes: Sneakers, heels, flats, boots, sandals, juttis, kolhapuris, loafers
- Accessories: Bags, jewelry, watches, scarves, belts, hats, sunglasses

COLOR ANALYSIS: Be specific (e.g., "Navy Blue", "Burgundy", "Olive Green", "Coral Pink")

OCCASION MAPPING:
- Casual: Everyday wear, relaxed outings
- Work: Office appropriate, professional settings
- Party: Nightlife, celebrations, events
- Date: Romantic outings, dinner dates
- Formal: Weddings, ceremonies, black-tie events

Respond with ONLY valid JSON:
{
    "category": "Tops|Bottoms|Dresses|Outerwear|Shoes|Accessories",
    "subcategory": "Specific type (e.g., Polo Shirt, Skinny Jeans, Kurta, Sneakers)",
    "colors": ["Primary color", "Secondary color if visible"],
    "pattern": "Solid|Striped|Floral|Plaid|Checked|Printed|Embroidered|Abstract|Animal Print|Geometric",
    "occasions": ["List all suitable occasions from: Casual, Work, Party, Date, Formal"],
    "style_tags": ["2-4 tags from: minimalist, bohemian, streetwear, ethnic, classic, edgy, preppy, sporty, romantic, vintage"],
    "seasonality": ["Suitable seasons: Spring, Summer, Fall, Winter, All-Season"],
    "confidence": 0.95
}

IMPORTANT: Recognize Indian garments accurately - kurta, kurti, saree, lehenga, salwar kameez, churidar, dupatta, sherwani, juttis, kolhapuris, mojaris."""

        try:
            logger.info("Calling Gemini for clothing analysis...")
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    temperature=0.2,
                )
            )

            # Extract text and parse JSON
            response_text = response.text.strip()
            logger.info(f"Gemini response (first 100 chars): {response_text[:100]}...")

            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            result = json.loads(response_text)
            logger.info(f"Clothing analysis successful: {result.get('category')}/{result.get('subcategory')}")
            return result

        except Exception as e:
            logger.error(f"Clothing analysis failed: {e}", exc_info=True)
            return {
                "category": "Tops",
                "subcategory": "Unknown",
                "colors": ["Unknown"],
                "pattern": "Solid",
                "occasions": ["Casual"],
                "style_tags": ["unclassified"],
                "seasonality": ["All-Season"],
                "confidence": 0.0,
                "error": str(e)
            }

    async def analyze_body(self, image_base64: str) -> Dict[str, Any]:
        """
        Analyze body type, skin tone, and face shape from selfie.

        Returns personalized style recommendations.
        """
        image_part = self._prepare_image(image_base64)

        prompt = """You are an expert fashion stylist and image consultant. Analyze this person's photo to provide personalized fashion recommendations.

IMPORTANT ANALYSIS GUIDELINES:
1. BODY TYPE: Look at shoulder-to-hip ratio, waist definition, and overall proportions
   - Hourglass: Balanced shoulders and hips with defined waist
   - Pear: Hips wider than shoulders
   - Apple: Wider midsection, slimmer legs
   - Rectangle: Similar measurements throughout
   - Inverted Triangle: Broader shoulders than hips
   - Athletic: Muscular build with less waist definition

2. SKIN TONE: Analyze visible skin areas for:
   - Depth: Fair, Light, Medium, Tan, Deep
   - Undertone: Look at veins (blue=cool, green=warm, both=neutral)

3. FACE SHAPE: Analyze facial structure for accessory recommendations

Provide a POSITIVE, EMPOWERING analysis. Focus on what flatters, not flaws.

Respond with ONLY valid JSON in this EXACT format:
{
    "body_type": {
        "type": "Hourglass|Pear|Apple|Rectangle|Inverted Triangle|Athletic",
        "description": "A positive 1-2 sentence description highlighting their natural assets",
        "recommendations": [
            "Specific flattering style recommendation 1",
            "Specific flattering style recommendation 2",
            "Specific flattering style recommendation 3",
            "Specific flattering style recommendation 4"
        ]
    },
    "skin_tone": {
        "type": "Fair|Light|Medium|Tan|Deep",
        "undertone": "warm|cool|neutral",
        "best_colors": ["Specific color 1", "Specific color 2", "Specific color 3", "Specific color 4", "Specific color 5"],
        "avoid_colors": ["Color to avoid 1", "Color to avoid 2"],
        "metal_recommendation": "Gold|Silver|Rose Gold|Both"
    },
    "face_shape": {
        "type": "Oval|Round|Square|Heart|Oblong|Diamond",
        "description": "Brief positive description of their face shape",
        "flattering_necklines": ["Neckline 1", "Neckline 2", "Neckline 3"],
        "flattering_accessories": ["Accessory style 1", "Accessory style 2"]
    },
    "overall_recommendations": [
        "Personalized styling tip 1 based on their unique features",
        "Personalized styling tip 2",
        "Personalized styling tip 3"
    ],
    "confidence": 0.85
}

Be specific with colors (e.g., "Emerald Green" not just "Green", "Coral" not just "Orange").
Consider Indian fashion context - include recommendations for ethnic wear when relevant."""

        try:
            logger.info("Calling Gemini for body analysis...")
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    temperature=0.3,
                )
            )

            # Extract text and parse JSON
            response_text = response.text.strip()
            logger.info(f"Gemini raw response (first 200 chars): {response_text[:200]}...")

            # Remove markdown code blocks if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            result = json.loads(response_text)
            logger.info(f"Body analysis successful: body_type={result.get('body_type', {}).get('type')}, skin_tone={result.get('skin_tone', {}).get('type')}")
            return result

        except Exception as e:
            logger.error(f"Body analysis failed: {e}", exc_info=True)
            return {
                "body_type": {
                    "type": "Rectangle",
                    "description": "Balanced proportions that work with many styles",
                    "recommendations": ["Belted dresses to define waist", "Peplum tops", "High-waisted bottoms", "Layered outfits"]
                },
                "skin_tone": {
                    "type": "Medium",
                    "undertone": "neutral",
                    "best_colors": ["Navy Blue", "Emerald Green", "Burgundy", "Teal", "Mustard"],
                    "avoid_colors": ["Neon Yellow", "Washed-out Pastels"],
                    "metal_recommendation": "Both"
                },
                "face_shape": {
                    "type": "Oval",
                    "description": "Versatile face shape that suits most styles",
                    "flattering_necklines": ["V-neck", "Scoop neck", "Boat neck"],
                    "flattering_accessories": ["Most earring styles", "Classic frames"]
                },
                "overall_recommendations": [
                    "Try uploading a clearer full-body photo for personalized recommendations",
                    "Good lighting helps with accurate skin tone analysis",
                    "Stand naturally for best body type assessment"
                ],
                "confidence": 0.0,
                "error": str(e)
            }

    async def generate_outfit_suggestion(
        self,
        wardrobe_items: List[Dict[str, Any]],
        occasion: str,
        style_preferences: Dict[str, float],
        weather: Optional[Dict[str, Any]] = None,
        body_analysis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Generate outfit suggestions from user's wardrobe.
        """
        # Prepare wardrobe summary (no images, just attributes)
        wardrobe_summary = []
        for item in wardrobe_items:
            wardrobe_summary.append({
                "id": item.get("id"),
                "category": item.get("category"),
                "subcategory": item.get("subcategory"),
                "colors": item.get("colors", []),
                "pattern": item.get("pattern"),
                "occasions": item.get("occasions", [])
            })

        # Style context
        top_styles = sorted(style_preferences.items(), key=lambda x: x[1], reverse=True)[:3]
        style_context = ", ".join([s[0] for s in top_styles if s[1] > 0.2])

        # Weather context
        weather_str = ""
        if weather:
            weather_str = f"Weather: {weather.get('temperature', 25)}°C, {weather.get('condition', 'Clear')}"

        prompt = f"""Create an outfit suggestion from this wardrobe for a {occasion} occasion.

WARDROBE ITEMS:
{json.dumps(wardrobe_summary, indent=2)}

CONTEXT:
- Occasion: {occasion}
- Style preferences: {style_context if style_context else 'Not specified'}
{f'- {weather_str}' if weather_str else ''}

Respond with ONLY valid JSON:
{{
    "success": true,
    "outfit_name": "Creative name for the outfit",
    "outfit": [
        {{"id": "item_id_from_wardrobe", "type": "top/bottom/etc", "name": "Item description", "styling_note": "How to wear it"}}
    ],
    "occasion_fit": "Why this works for {occasion}",
    "styling_tips": ["Tip 1", "Tip 2"],
    "alternatives": [
        {{"id": "alt_item_id", "type": "category", "name": "Alternative option"}}
    ]
}}

IMPORTANT: Only use item IDs that exist in the wardrobe. Create a cohesive, color-coordinated outfit."""

        try:
            logger.info("Calling Gemini for outfit suggestion...")
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.5,
                )
            )

            # Extract text and parse JSON
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            result = json.loads(response_text)
            result["success"] = True
            logger.info(f"Outfit suggestion generated: {result.get('outfit_name')}")
            return result

        except Exception as e:
            logger.error(f"Outfit suggestion failed: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Failed to generate outfit: {str(e)}",
                "outfit": None
            }

    async def get_shopping_recommendations(
        self,
        wardrobe_items: List[Dict[str, Any]],
        style_preferences: Dict[str, float],
        body_analysis: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Analyze wardrobe gaps and suggest items to buy.
        """
        # Aggregate wardrobe stats
        categories = {}
        colors = {}
        for item in wardrobe_items:
            cat = item.get("category", "Unknown")
            categories[cat] = categories.get(cat, 0) + 1
            for color in item.get("colors", []):
                colors[color] = colors.get(color, 0) + 1

        top_styles = sorted(style_preferences.items(), key=lambda x: x[1], reverse=True)[:3]
        style_prefs = [s[0] for s in top_styles if s[1] > 0.2]

        prompt = f"""Analyze this wardrobe and recommend items to buy.

CURRENT WARDROBE:
- Categories: {json.dumps(categories)}
- Colors: {json.dumps(colors)}
- Total items: {len(wardrobe_items)}
- Style preferences: {', '.join(style_prefs) if style_prefs else 'Not specified'}

Respond with ONLY valid JSON:
{{
    "gaps": [
        {{
            "item": "Specific item name (e.g., 'White Sneakers')",
            "category": "Category",
            "reason": "Why this would improve the wardrobe",
            "priority": "high|medium|low",
            "suggested_colors": ["color1", "color2"]
        }}
    ],
    "wardrobe_summary": "Brief analysis of current wardrobe strengths",
    "missing_basics": ["Essential item 1", "Essential item 2"],
    "style_expansion": ["Item to try new style"]
}}

Focus on versatile pieces that create the most new outfit combinations."""

        try:
            logger.info("Calling Gemini for shopping recommendations...")
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.4,
                )
            )

            # Extract text and parse JSON
            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            result = json.loads(response_text)
            logger.info(f"Shopping recommendations: {len(result.get('gaps', []))} gaps identified")
            return result

        except Exception as e:
            logger.error(f"Shopping recommendations failed: {e}", exc_info=True)
            return {
                "gaps": [],
                "wardrobe_summary": "Unable to analyze",
                "missing_basics": [],
                "style_expansion": [],
                "error": str(e)
            }

    async def virtual_try_on(
        self,
        outfit_items: List[Dict[str, Any]],
        body_analysis: Optional[Dict[str, Any]] = None,
        occasion: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate AI visualization description of how an outfit would look on the user.

        Returns personalized styling advice based on body type and the selected outfit.
        """
        # Build outfit description
        outfit_desc = []
        for item in outfit_items:
            desc = f"- {item.get('category', 'Item')}: {item.get('subcategory', '')} in {', '.join(item.get('colors', ['unknown color']))}"
            if item.get('pattern') and item.get('pattern') != 'Solid':
                desc += f" ({item.get('pattern')} pattern)"
            outfit_desc.append(desc)

        outfit_text = "\n".join(outfit_desc)

        # Build body context
        body_context = "No body analysis available - providing general advice."
        if body_analysis:
            body_type = body_analysis.get("body_type", {})
            skin_tone = body_analysis.get("skin_tone", {})
            body_context = f"""
Body Type: {body_type.get('type', 'Unknown')} - {body_type.get('description', '')}
Skin Tone: {skin_tone.get('type', 'Unknown')} with {skin_tone.get('undertone', 'neutral')} undertone
Best Colors: {', '.join(skin_tone.get('best_colors', [])[:5])}
Colors to Avoid: {', '.join(skin_tone.get('avoid_colors', [])[:3])}
"""

        prompt = f"""You are an expert fashion stylist providing a virtual try-on experience.
Based on the user's body analysis and selected outfit, create a vivid, personalized description of how this outfit would look on them.

OUTFIT SELECTED:
{outfit_text}

USER'S PROFILE:
{body_context}

OCCASION: {occasion or 'General wear'}

Provide a response in this JSON format:
{{
    "visualization": "A vivid 2-3 sentence description of how this outfit looks on the user, mentioning specific flattering aspects based on their body type",
    "fit_score": 85,
    "color_harmony": "Excellent|Good|Fair - brief explanation of how colors work with skin tone",
    "body_flattery": "How the outfit flatters their specific body type",
    "styling_tips": [
        "Specific tip 1 for wearing this outfit",
        "Specific tip 2",
        "Accessory suggestion"
    ],
    "occasion_verdict": "How appropriate this outfit is for the occasion",
    "confidence_boost": "An encouraging, body-positive statement about how they'll look"
}}

Be specific, positive, and personalized. Focus on what works well."""

        try:
            logger.info("Calling Gemini for virtual try-on visualization...")
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    temperature=0.7,
                )
            )

            response_text = response.text.strip()
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.startswith("```"):
                response_text = response_text[3:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            response_text = response_text.strip()

            result = json.loads(response_text)
            result["success"] = True
            logger.info(f"Virtual try-on generated, fit_score: {result.get('fit_score')}")
            return result

        except Exception as e:
            logger.error(f"Virtual try-on failed: {e}", exc_info=True)
            return {
                "success": False,
                "visualization": "This outfit combination looks great! The pieces work well together for a stylish, put-together look.",
                "fit_score": 75,
                "color_harmony": "Good - classic color combination",
                "body_flattery": "This outfit creates a balanced silhouette",
                "styling_tips": [
                    "Ensure proper fit for the most flattering look",
                    "Add a statement accessory to elevate the outfit",
                    "Consider the weather when finalizing"
                ],
                "occasion_verdict": "Versatile outfit suitable for multiple occasions",
                "confidence_boost": "You're going to look amazing! Own your style with confidence.",
                "error": str(e)
            }


# Singleton instance
_gemini_service: Optional[GeminiService] = None

def get_gemini_service(api_key: str) -> GeminiService:
    """Get or create GeminiService singleton."""
    global _gemini_service
    if _gemini_service is None:
        _gemini_service = GeminiService(api_key)
    return _gemini_service
