"""
Order fulfillment automation.
Watches for new Shopify orders, places supplier orders, and updates tracking.
"""

import logging
from datetime import datetime

import httpx

from python.db import OrderDB, ActiveProductDB
from python.models import OrderStatus

logger = logging.getLogger("dropbot.orders")


class OrderManager:
    """Handles the full order lifecycle: detection → fulfillment → tracking."""

    def __init__(self, config):
        self.config = config
        self.order_db = OrderDB()
        self.product_db = ActiveProductDB()
        self.api_base = f"http://localhost:{config.api_port}"
        self.client = httpx.AsyncClient(timeout=30.0)

    async def close(self):
        await self.client.aclose()

    async def process_new_orders(self) -> int:
        """
        Check for new Shopify orders via the API and create
        local order records for fulfillment.
        Returns count of new orders processed.
        """
        logger.info("📋 Checking for new orders...")

        try:
            resp = await self.client.get(f"{self.api_base}/api/orders/new")
            if resp.status_code != 200:
                logger.error(f"Failed to fetch orders: {resp.status_code}")
                return 0

            new_orders = resp.json().get("orders", [])
            processed = 0

            for order_data in new_orders:
                shopify_order_id = order_data.get("shopify_order_id", "")

                # Check if we already have this order
                existing = [
                    o for o in self.order_db.get_all()
                    if o.get("shopify_order_id") == shopify_order_id
                ]
                if existing:
                    continue

                # Find the matching product
                product = None
                shopify_product_id = order_data.get("product_id", "")
                if shopify_product_id:
                    product = self.product_db.get_by_shopify_id(shopify_product_id)

                cost_price = product["cost_price"] if product else 0

                order_id = self.order_db.insert({
                    "shopify_order_id": shopify_order_id,
                    "shopify_order_number": order_data.get("order_number", ""),
                    "product_id": product["id"] if product else "",
                    "variant_id": order_data.get("variant_id", ""),
                    "quantity": order_data.get("quantity", 1),
                    "customer_email": order_data.get("customer_email", ""),
                    "customer_name": order_data.get("customer_name", ""),
                    "shipping_address": order_data.get("shipping_address", ""),
                    "sale_price": order_data.get("total_price", 0),
                    "cost_price": cost_price,
                })

                # Record the sale on the product
                if product:
                    self.product_db.record_sale(
                        product["id"],
                        order_data.get("total_price", 0)
                    )

                logger.info(
                    f"  📦 New order: #{order_data.get('order_number', '?')} "
                    f"- ${order_data.get('total_price', 0):.2f}"
                )
                processed += 1

            logger.info(f"✅ Processed {processed} new orders")
            return processed

        except Exception as e:
            logger.error(f"Order processing error: {e}")
            return 0

    async def fulfill_pending_orders(self) -> int:
        """
        Place orders with suppliers for all pending orders.
        Returns count of orders fulfilled.
        """
        logger.info("🚚 Fulfilling pending orders...")
        pending = self.order_db.get_pending()
        fulfilled = 0

        for order in pending:
            try:
                product = self.product_db.get_by_id(order.get("product_id", ""))
                if not product:
                    logger.warning(f"  ⚠️  No product found for order {order['id']}")
                    continue

                # Place order with supplier
                # This is where you'd integrate with the actual supplier API
                # For now, we mark it as placed and log it
                supplier_order_id = await self._place_supplier_order(order, product)

                if supplier_order_id:
                    self.order_db.update_status(
                        order["id"],
                        OrderStatus.PLACED_WITH_SUPPLIER.value,
                        supplier_order_id=supplier_order_id,
                        fulfilled_at=datetime.utcnow().isoformat(),
                    )
                    fulfilled += 1
                    logger.info(
                        f"  ✅ Placed with supplier: Order {order.get('shopify_order_number', order['id'])}"
                    )

                    # Notify via Discord
                    await self._notify_discord(
                        f"📦 Order #{order.get('shopify_order_number', '?')} "
                        f"placed with supplier (ID: {supplier_order_id})"
                    )

            except Exception as e:
                logger.error(f"  ❌ Failed to fulfill order {order['id']}: {e}")

        logger.info(f"✅ Fulfilled {fulfilled}/{len(pending)} orders")
        return fulfilled

    async def _place_supplier_order(self, order: dict, product: dict) -> str:
        """
        Place an order with the supplier.
        Returns the supplier order ID.

        TODO: Implement actual supplier API integration for:
        - AliExpress (via browser automation)
        - CJ Dropshipping (via API)
        - Spocket (via API)
        """
        import json
        supplier_info = json.loads(product.get("supplier_info", "{}"))
        platform = supplier_info.get("platform", "unknown")

        logger.info(
            f"  🏭 Placing order with {platform}: {product['title'][:40]}"
        )

        # PLACEHOLDER: In production, this would call the supplier's API
        # For now, return a simulated order ID
        import uuid
        simulated_id = f"SUP-{uuid.uuid4().hex[:8].upper()}"

        logger.info(f"  📝 Supplier order ID: {simulated_id} (simulated)")
        return simulated_id

    async def update_tracking(self) -> int:
        """
        Check supplier for tracking updates on placed orders
        and push tracking info to Shopify.
        """
        logger.info("📡 Checking for tracking updates...")
        placed_orders = [
            o for o in self.order_db.get_all()
            if o.get("status") == OrderStatus.PLACED_WITH_SUPPLIER.value
        ]
        updated = 0

        for order in placed_orders:
            try:
                # PLACEHOLDER: Check supplier API for tracking
                tracking = await self._check_supplier_tracking(
                    order.get("supplier_order_id", "")
                )

                if tracking:
                    self.order_db.update_status(
                        order["id"],
                        OrderStatus.SHIPPED.value,
                        tracking_number=tracking["number"],
                        tracking_url=tracking.get("url", ""),
                    )

                    # Push tracking to Shopify via API
                    await self.client.post(
                        f"{self.api_base}/api/orders/{order['shopify_order_id']}/tracking",
                        json=tracking,
                    )

                    updated += 1
                    logger.info(
                        f"  📬 Tracking updated: #{order.get('shopify_order_number', '?')} "
                        f"→ {tracking['number']}"
                    )

            except Exception as e:
                logger.error(f"  ❌ Tracking check failed for {order['id']}: {e}")

        logger.info(f"✅ Updated tracking for {updated} orders")
        return updated

    async def _check_supplier_tracking(self, supplier_order_id: str) -> dict | None:
        """
        Check supplier for tracking info.
        TODO: Implement actual supplier API check.
        """
        # PLACEHOLDER: Would check actual supplier API
        return None

    async def _notify_discord(self, message: str) -> None:
        """Send a notification to Discord via the API."""
        try:
            await self.client.post(
                f"{self.api_base}/api/discord/notify",
                json={"message": message},
            )
        except Exception as e:
            logger.debug(f"Discord notification failed: {e}")

    def get_order_stats(self) -> dict:
        """Get order statistics for the dashboard."""
        return self.order_db.get_stats()
