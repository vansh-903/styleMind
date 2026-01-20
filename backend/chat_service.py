# LangChain-based AI Fashion Stylist Chat Service
import os
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

logger = logging.getLogger(__name__)

# Fashion Stylist System Prompt
STYLIST_SYSTEM_PROMPT = """You are StyleMind AI, a friendly and knowledgeable personal fashion stylist assistant.

Your expertise includes:
- Personal style advice based on body type, skin tone, and preferences
- Outfit recommendations for various occasions (work, casual, party, date, formal)
- Color coordination and pattern mixing guidance
- Wardrobe building and capsule wardrobe concepts
- Indian fashion (kurtas, sarees, lehengas) and Western fashion
- Seasonal dressing and trend awareness
- Budget-friendly styling tips

Personality:
- Warm, encouraging, and non-judgmental
- Give specific, actionable advice
- Use fashion terminology but explain when needed
- Be enthusiastic about helping users look their best
- Ask clarifying questions when needed

Context about the user (if available):
{user_context}

Guidelines:
- Keep responses concise but helpful (2-4 paragraphs max)
- Use emojis sparingly for warmth 👗✨
- If asked about specific items, relate advice to their wardrobe if known
- Always be body-positive and inclusive
- Suggest items across different price ranges when relevant
"""

class ChatService:
    """LangChain-based fashion stylist chat service."""

    def __init__(self, api_key: str):
        """Initialize with Gemini API key."""
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.0-flash",
            google_api_key=api_key,
            temperature=0.7,
            convert_system_message_to_human=True
        )

        # Store conversation history per user
        self.conversations: Dict[str, List] = {}

        # Create the prompt template
        self.prompt = ChatPromptTemplate.from_messages([
            ("system", STYLIST_SYSTEM_PROMPT),
            MessagesPlaceholder(variable_name="history"),
            ("human", "{input}")
        ])

        # Create the chain
        self.chain = self.prompt | self.llm | StrOutputParser()

    def _get_user_context(self, user_data: Optional[Dict] = None, wardrobe: Optional[List] = None) -> str:
        """Build user context string from available data."""
        if not user_data and not wardrobe:
            return "No user profile available yet."

        context_parts = []

        if user_data:
            if user_data.get("gender"):
                context_parts.append(f"Gender: {user_data['gender']}")

            if user_data.get("body_analysis"):
                ba = user_data["body_analysis"]
                if ba.get("body_type", {}).get("type"):
                    context_parts.append(f"Body type: {ba['body_type']['type']}")
                if ba.get("skin_tone", {}).get("type"):
                    context_parts.append(f"Skin tone: {ba['skin_tone']['type']} with {ba['skin_tone'].get('undertone', 'neutral')} undertone")
                if ba.get("skin_tone", {}).get("best_colors"):
                    context_parts.append(f"Best colors: {', '.join(ba['skin_tone']['best_colors'][:5])}")

            if user_data.get("style_dna"):
                # Get top styles
                style_dna = user_data["style_dna"]
                top_styles = sorted(style_dna.items(), key=lambda x: x[1], reverse=True)[:3]
                preferred = [s[0] for s in top_styles if s[1] > 0.3]
                if preferred:
                    context_parts.append(f"Preferred styles: {', '.join(preferred)}")

        if wardrobe:
            categories = {}
            colors = set()
            for item in wardrobe[:20]:  # Limit to recent items
                cat = item.get("category", "Unknown")
                categories[cat] = categories.get(cat, 0) + 1
                for color in item.get("colors", [])[:2]:
                    colors.add(color)

            if categories:
                cat_summary = ", ".join([f"{v} {k}" for k, v in categories.items()])
                context_parts.append(f"Wardrobe: {cat_summary}")
            if colors:
                context_parts.append(f"Colors in wardrobe: {', '.join(list(colors)[:8])}")

        return "\n".join(context_parts) if context_parts else "No detailed profile yet."

    def get_conversation_history(self, user_id: str) -> List:
        """Get conversation history for a user."""
        return self.conversations.get(user_id, [])

    def clear_conversation(self, user_id: str):
        """Clear conversation history for a user."""
        if user_id in self.conversations:
            del self.conversations[user_id]

    async def chat(
        self,
        user_id: str,
        message: str,
        user_data: Optional[Dict] = None,
        wardrobe: Optional[List] = None
    ) -> Dict[str, Any]:
        """
        Send a message and get AI stylist response.

        Args:
            user_id: User identifier for conversation tracking
            message: User's message
            user_data: Optional user profile data
            wardrobe: Optional list of wardrobe items

        Returns:
            Dict with response and metadata
        """
        try:
            # Get or initialize conversation history
            if user_id not in self.conversations:
                self.conversations[user_id] = []

            history = self.conversations[user_id]

            # Build user context
            user_context = self._get_user_context(user_data, wardrobe)

            # Get response from LangChain
            response = await self.chain.ainvoke({
                "user_context": user_context,
                "history": history,
                "input": message
            })

            # Update conversation history (keep last 20 messages)
            history.append(HumanMessage(content=message))
            history.append(AIMessage(content=response))
            if len(history) > 20:
                history = history[-20:]
            self.conversations[user_id] = history

            logger.info(f"Chat response generated for user {user_id[:8]}...")

            return {
                "success": True,
                "response": response,
                "timestamp": datetime.utcnow().isoformat(),
                "message_count": len(history) // 2
            }

        except Exception as e:
            logger.error(f"Chat error: {str(e)}")
            return {
                "success": False,
                "response": "I'm having trouble connecting right now. Please try again in a moment! 💫",
                "error": str(e)
            }

    async def get_outfit_advice(
        self,
        user_id: str,
        occasion: str,
        preferences: Optional[str] = None,
        user_data: Optional[Dict] = None,
        wardrobe: Optional[List] = None
    ) -> Dict[str, Any]:
        """
        Get specific outfit advice for an occasion.
        """
        prompt = f"I need outfit advice for a {occasion} occasion."
        if preferences:
            prompt += f" My preferences: {preferences}"
        prompt += " What should I wear?"

        return await self.chat(user_id, prompt, user_data, wardrobe)

    async def analyze_outfit(
        self,
        user_id: str,
        outfit_description: str,
        occasion: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Get feedback on a specific outfit.
        """
        prompt = f"Can you give me feedback on this outfit: {outfit_description}"
        if occasion:
            prompt += f" I'm planning to wear it for {occasion}."

        return await self.chat(user_id, prompt)


# Singleton instance
_chat_service: Optional[ChatService] = None

def get_chat_service(api_key: str) -> ChatService:
    """Get or create ChatService singleton."""
    global _chat_service
    if _chat_service is None:
        _chat_service = ChatService(api_key)
    return _chat_service
