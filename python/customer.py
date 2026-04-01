"""
AI-powered customer service.
Reads customer messages, generates responses, and escalates complex issues.
"""

import logging
from datetime import datetime

import httpx

from python.ai_utils import AIEngine
from python.db import OrderDB
from python.models import CustomerMessage, CustomerMessageType

logger = logging.getLogger("dropbot.customer")


class CustomerServiceAgent:
    """
    AI-powered customer service agent.
    Handles common inquiries automatically, escalates complex issues.
    """

    def __init__(self, config):
        self.config = config
        self.ai = AIEngine(config)
        self.order_db = OrderDB()
        self.api_base = f"http://localhost:{config.api_port}"
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def process_messages(self) -> int:
        """
        Process all unhandled customer messages.
        Returns count of messages handled.
        """
        logger.info("💬 Processing customer messages...")

        try:
            # Fetch unhandled messages from the API
            resp = await self.client.get(f"{self.api_base}/api/messages/unhandled")
            if resp.status_code != 200:
                logger.error(f"Failed to fetch messages: {resp.status_code}")
                return 0

            messages = resp.json().get("messages", [])
            handled = 0

            for msg_data in messages:
                try:
                    message = CustomerMessage(**msg_data)
                    await self._handle_message(message)
                    handled += 1
                except Exception as e:
                    logger.error(f"  ❌ Failed to handle message: {e}")

            logger.info(f"✅ Handled {handled}/{len(messages)} messages")
            return handled

        except Exception as e:
            logger.error(f"Message processing error: {e}")
            return 0

    async def _handle_message(self, message: CustomerMessage) -> None:
        """Handle a single customer message."""
        # Classify the message type
        message_type = self._classify_message(message)
        message.message_type = message_type

        logger.info(
            f"  📨 {message.customer_email}: {message_type.value} - {message.subject[:40]}"
        )

        # Get order context if applicable
        order_context = None
        if message.order_id:
            order = self.order_db.get_by_id(message.order_id)
            if order:
                order_context = order

        # Check if this needs escalation
        if self._should_escalate(message):
            message.escalated = True
            logger.info(f"    ⚠️  Escalated to human review")
            await self._escalate_to_discord(message)
            return

        # Generate AI response
        response = await self.ai.generate_customer_response(message, order_context)

        if response:
            message.ai_response = response
            message.resolved = True
            message.responded_at = datetime.utcnow()

            # Send response via the API
            await self.client.post(
                f"{self.api_base}/api/messages/respond",
                json={
                    "message_id": message.id,
                    "response": response,
                    "customer_email": message.customer_email,
                },
            )

            logger.info(f"    ✅ Auto-responded")
        else:
            # AI couldn't generate a response — escalate
            message.escalated = True
            await self._escalate_to_discord(message)

    def _classify_message(self, message: CustomerMessage) -> CustomerMessageType:
        """Classify the type of customer message based on content."""
        body_lower = message.body.lower()
        subject_lower = message.subject.lower()
        combined = body_lower + " " + subject_lower

        if any(word in combined for word in ["track", "shipping", "where is", "delivery", "arrive"]):
            return CustomerMessageType.SHIPPING_INQUIRY

        if any(word in combined for word in ["order status", "order #", "my order"]):
            return CustomerMessageType.ORDER_STATUS

        if any(word in combined for word in ["return", "refund", "send back", "exchange"]):
            return CustomerMessageType.RETURN_REQUEST

        if any(word in combined for word in ["broken", "damaged", "wrong", "complaint", "terrible", "horrible"]):
            return CustomerMessageType.COMPLAINT

        return CustomerMessageType.GENERAL

    def _should_escalate(self, message: CustomerMessage) -> bool:
        """Determine if a message should be escalated to human review."""
        escalation_triggers = [
            CustomerMessageType.RETURN_REQUEST,
            CustomerMessageType.COMPLAINT,
        ]

        if message.message_type in escalation_triggers:
            return True

        # Escalate if message contains strong negative sentiment
        angry_words = ["lawsuit", "lawyer", "attorney", "fraud", "scam", "report", "bbb"]
        body_lower = message.body.lower()
        if any(word in body_lower for word in angry_words):
            return True

        return False

    async def _escalate_to_discord(self, message: CustomerMessage) -> None:
        """Escalate a message to Discord for human review."""
        alert = (
            f"🚨 **Customer Message Needs Attention**\n\n"
            f"**From:** {message.customer_name or message.customer_email}\n"
            f"**Type:** {message.message_type.value}\n"
            f"**Subject:** {message.subject}\n"
            f"**Message:** {message.body[:300]}{'...' if len(message.body) > 300 else ''}\n\n"
            f"Please respond manually or reply with instructions."
        )

        try:
            await self.client.post(
                f"{self.api_base}/api/discord/notify",
                json={"message": alert, "urgent": True},
            )
        except Exception as e:
            logger.error(f"Discord escalation failed: {e}")
