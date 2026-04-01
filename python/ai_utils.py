"""
Shared AI utilities for the dropshipping bot.
Handles LLM calls for product copy generation, customer service, and product evaluation.
"""

import json
import logging
from typing import Optional

from openai import AsyncOpenAI

from python.models import ProductCandidate, CustomerMessage

logger = logging.getLogger("dropbot.ai")


class AIEngine:
    """
    Manages all LLM interactions for the dropshipping bot.
    Currently supports OpenAI — easily extensible to Anthropic/Ollama.
    """

    def __init__(self, config):
        self.config = config
        self.llm_config = config.llm

        if self.llm_config.provider == "openai":
            self.client = AsyncOpenAI(api_key=self.llm_config.openai_api_key)
            self.model = "gpt-4o-mini"  # Fast and cheap for product copy
        else:
            # Fallback — can be extended for Anthropic/Ollama
            self.client = AsyncOpenAI(api_key=self.llm_config.openai_api_key)
            self.model = "gpt-4o-mini"

    async def _chat(self, system: str, user: str, temperature: float = 0.7) -> str:
        """Make a chat completion call."""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                temperature=temperature,
                max_tokens=1000,
            )
            return response.choices[0].message.content or ""
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            return ""

    # ─── Product Copy Generation ────────────────────────

    async def generate_product_listing(self, candidate: ProductCandidate) -> dict:
        """
        Generate a complete Shopify product listing:
        - SEO-optimized title
        - Compelling description (HTML)
        - Tags for discoverability
        """
        system = """You are an expert e-commerce copywriter specializing in dropshipping product listings.
You write compelling, SEO-optimized product titles and descriptions that convert browsers into buyers.
Your descriptions should:
- Highlight key benefits and features
- Use persuasive language without being spammy
- Include relevant keywords naturally
- Be formatted in clean HTML with bullet points
- Create urgency without being dishonest
Always respond in valid JSON format."""

        user = f"""Create a Shopify product listing for this product:

Title: {candidate.title}
Category: {candidate.category}
Price: ${candidate.suggested_retail_price}
Source: {candidate.source.value}
Review Score: {candidate.review_score}★

Respond with JSON:
{{
    "title": "SEO-optimized product title (max 70 chars)",
    "description": "HTML product description with features and benefits",
    "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
    "seo_title": "SEO meta title (max 60 chars)",
    "seo_description": "SEO meta description (max 160 chars)"
}}"""

        response = await self._chat(system, user, temperature=0.6)

        try:
            # Try to parse JSON from response
            # Handle potential markdown code blocks
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(cleaned)
        except (json.JSONDecodeError, IndexError):
            logger.warning("Failed to parse AI listing response, using defaults")
            return {
                "title": candidate.title[:70],
                "description": f"<p>{candidate.title}</p><p>High-quality product with excellent reviews.</p>",
                "tags": [candidate.category, "trending", "bestseller"],
                "seo_title": candidate.title[:60],
                "seo_description": f"Shop {candidate.title[:100]} at the best price. Free shipping available.",
            }

    # ─── Customer Service ───────────────────────────────

    async def generate_customer_response(self, message: CustomerMessage, order_context: Optional[dict] = None) -> str:
        """
        Generate a customer service response based on the incoming message
        and available order context.
        """
        system = """You are a helpful, friendly customer service representative for an online store.
You are professional but warm. Keep responses concise and helpful.
If you can't resolve an issue, say you'll escalate it to a specialist.
Never make up tracking information or delivery dates you don't have.
If order context is provided, use it to give specific answers."""

        context_str = ""
        if order_context:
            context_str = f"""
Order Details:
- Order #: {order_context.get('shopify_order_number', 'N/A')}
- Status: {order_context.get('status', 'Unknown')}
- Tracking: {order_context.get('tracking_number', 'Not yet available')}
- Ordered: {order_context.get('created_at', 'Unknown')}
"""

        user = f"""Customer: {message.customer_name or message.customer_email}
Subject: {message.subject}
Message: {message.body}
{context_str}

Write a helpful response:"""

        response = await self._chat(system, user, temperature=0.5)
        return response.strip()

    # ─── Product Evaluation ─────────────────────────────

    async def evaluate_product(self, candidate: ProductCandidate) -> dict:
        """
        Have the AI evaluate a product candidate and provide a recommendation.
        Returns a score and reasoning.
        """
        system = """You are an expert dropshipping product analyst.
Evaluate products based on:
- Market demand and trend potential
- Profit margin viability
- Competition level
- Product quality indicators (reviews, ratings)
- Shipping logistics feasibility
Always respond in valid JSON format."""

        user = f"""Evaluate this product for a dropshipping store:

Product: {candidate.title}
Category: {candidate.category}
Source: {candidate.source.value}
Supplier Price: ${candidate.supplier_price}
Our Price: ${candidate.suggested_retail_price}
Profit Margin: {candidate.profit_margin:.0%}
Review Score: {candidate.review_score}★ ({candidate.review_count} reviews)
Competitors: {candidate.competitor_count}
Trending Score: {candidate.trending_score}/100
Shipping Days: {candidate.supplier.estimated_shipping_days}

Respond with JSON:
{{
    "score": <1-10 overall score>,
    "recommendation": "list" or "skip",
    "reasoning": "Brief explanation",
    "risk_level": "low", "medium", or "high",
    "suggested_price_adjustment": <float or null>
}}"""

        response = await self._chat(system, user, temperature=0.3)

        try:
            cleaned = response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0]
            return json.loads(cleaned)
        except (json.JSONDecodeError, IndexError):
            return {
                "score": 5,
                "recommendation": "list" if candidate.profit_margin >= 0.30 else "skip",
                "reasoning": "Auto-evaluated based on margin threshold",
                "risk_level": "medium",
                "suggested_price_adjustment": None,
            }

    # ─── PicoClaw Message Formatting ────────────────────

    def format_for_picoclaw(self, candidates: list[ProductCandidate]) -> str:
        """
        Format product candidates into a structured prompt
        that PicoClaw can understand and make decisions on.
        """
        if not candidates:
            return "No new product candidates found in the latest scrape."

        lines = ["📦 **New Product Candidates for Review**\n"]
        for i, c in enumerate(candidates, 1):
            lines.append(
                f"{i}. **{c.title[:60]}**\n"
                f"   💰 Cost: ${c.supplier_price:.2f} → Sell: ${c.suggested_retail_price:.2f} "
                f"(margin: {c.profit_margin:.0%})\n"
                f"   ⭐ {c.review_score}★ ({c.review_count} reviews) | "
                f"📈 Trend: {c.trending_score}/100\n"
                f"   🚚 Ships in {c.supplier.estimated_shipping_days} days | "
                f"Source: {c.source.value}\n"
            )

        lines.append(
            "\nWhich products should I list? Reply with numbers (e.g., '1, 3, 5') "
            "or 'all' to list everything, or 'none' to skip."
        )

        return "\n".join(lines)

    def format_daily_report(self, stats: dict) -> str:
        """Format daily stats into a Discord-friendly report."""
        return (
            "📊 **Daily Dropshipping Report**\n\n"
            f"💵 Revenue: ${stats.get('revenue_today', 0):.2f}\n"
            f"💰 Profit: ${stats.get('profit_today', 0):.2f}\n"
            f"📦 Orders: {stats.get('orders_today', 0)}\n"
            f"🏪 Active Listings: {stats.get('active_listings', 0)}\n"
            f"⏳ Pending Orders: {stats.get('pending_count', 0)}\n"
            f"📈 Total Revenue: ${stats.get('total_revenue', 0):.2f}\n"
            f"📈 Total Profit: ${stats.get('total_profit', 0):.2f}\n"
        )
