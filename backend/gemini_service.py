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
    """

    def __init__(self, api_key: str):
        """Initialize with Gemini API key."""
        self.client = genai.Client(api_key=api_key)
        self.model = "gemini-2.0-flash"  # Fast and capable for vision

    def _prepare_image(self, image_base64: str) -> types.Part:
        """Convert base64 image to Gemini Part."""
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

        prompt = """Analyze this clothing item image and provide detailed fashion attributes.

You must respond with ONLY valid JSON in this exact format:
{
    "category": "Tops|Bottoms|Dresses|Outerwear|Shoes|Accessories",
    "subcategory": "specific type like T-Shirt, Jeans, Kurta, Saree, etc.",
    "colors": ["primary color", "secondary color if any"],
    "pattern": "Solid|Striped|Floral|Plaid|Printed|Embroidered",
    "occasions": ["Casual", "Work", "Party", "Date", "Formal"],
    "style_tags": ["minimalist", "bohemian", "streetwear", "ethnic", "classic"],
    "seasonality": ["Spring", "Summer", "Fall", "Winter", "All-Season"],
    "confidence": 0.95
}

Be specific with colors (e.g., "Navy Blue" not just "Blue").
Recognize Indian garments: kurta, kurti, saree, lehenga, salwar, dupatta, juttis, etc."""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                )
            )

            result = json.loads(response.text)
            logger.info(f"Clothing analysis: {result.get('category')}/{result.get('subcategory')}")
            return result

        except Exception as e:
            logger.error(f"Clothing analysis failed: {e}")
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

        prompt = """Analyze this photo for personalized fashion recommendations.

Provide a positive, empowering analysis. Respond with ONLY valid JSON:
{
    "body_type": {
        "type": "Rectangle|Hourglass|Pear|Apple|Inverted Triangle|Athletic",
        "description": "Brief positive description",
        "recommendations": ["flattering style 1", "flattering style 2", "flattering style 3"]
    },
    "skin_tone": {
        "type": "Fair|Light|Medium|Tan|Deep",
        "undertone": "warm|cool|neutral",
        "best_colors": ["color1", "color2", "color3", "color4", "color5"],
        "colors_to_avoid": ["color1", "color2"],
        "metal_recommendation": "Gold|Silver|Rose Gold|Both"
    },
    "face_shape": {
        "type": "Oval|Round|Square|Heart|Oblong|Diamond",
        "description": "Brief description",
        "flattering_necklines": ["V-neck", "Scoop", etc.],
        "flattering_accessories": ["earring style", "glasses style"]
    },
    "overall_recommendations": [
        "Personalized tip 1",
        "Personalized tip 2",
        "Personalized tip 3"
    ],
    "confidence": 0.85
}

Be encouraging and positive. Focus on what WILL look great."""

        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=[image_part, prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.3,
                )
            )

            result = json.loads(response.text)
            logger.info(f"Body analysis: {result.get('body_type', {}).get('type')}")
            return result

        except Exception as e:
            logger.error(f"Body analysis failed: {e}")
            return {
                "body_type": {
                    "type": "Unknown",
                    "description": "Unable to analyze",
                    "recommendations": ["Try uploading a clearer photo"]
                },
                "skin_tone": {
                    "type": "Medium",
                    "undertone": "neutral",
                    "best_colors": ["Navy", "White", "Black", "Grey"],
                    "colors_to_avoid": [],
                    "metal_recommendation": "Both"
                },
                "face_shape": {
                    "type": "Oval",
                    "description": "Versatile shape",
                    "flattering_necklines": ["Most styles work well"],
                    "flattering_accessories": ["Most styles complement"]
                },
                "overall_recommendations": ["Upload a clearer photo for personalized recommendations"],
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
            response = self.client.models.generate_content(
                model=self.model,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.5,
                )
            )

            result = json.loads(response.text)
            result["success"] = True
            logger.info(f"Outfit suggestion generated: {result.get('outfit_name')}")
            return result

        except Exception as e:
            logger.error(f"Outfit suggestion failed: {e}")
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
            response = self.client.models.generate_content(
                model=self.model,
                contents=[prompt],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.4,
                )
            )

            result = json.loads(response.text)
            logger.info(f"Shopping recommendations: {len(result.get('gaps', []))} gaps identified")
            return result

        except Exception as e:
            logger.error(f"Shopping recommendations failed: {e}")
            return {
                "gaps": [],
                "wardrobe_summary": "Unable to analyze",
                "missing_basics": [],
                "style_expansion": [],
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
