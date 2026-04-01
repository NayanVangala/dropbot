"""
SQLite database layer using sqlite-utils.
Lightweight persistent storage — no Postgres needed on the Pi.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path

import sqlite_utils

from python.config import config


def _get_db() -> sqlite_utils.Database:
    """Get or create the database connection."""
    db_path = Path(config.database_path)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite_utils.Database(str(db_path))
    _ensure_tables(db)
    return db


def _ensure_tables(db: sqlite_utils.Database) -> None:
    """Create tables if they don't exist."""

    if "product_candidates" not in db.table_names():
        db["product_candidates"].create({
            "id": str,
            "source": str,
            "source_url": str,
            "title": str,
            "description": str,
            "category": str,
            "tags": str,                    # JSON array
            "supplier_price": float,
            "suggested_retail_price": float,
            "profit_margin": float,
            "review_score": float,
            "review_count": int,
            "competitor_count": int,
            "trending_score": float,
            "image_urls": str,              # JSON array
            "supplier_info": str,           # JSON object
            "discovered_at": str,
            "status": str,
            "picoclaw_notes": str,
        }, pk="id")

    if "active_products" not in db.table_names():
        db["active_products"].create({
            "id": str,
            "shopify_product_id": str,
            "shopify_variant_id": str,
            "title": str,
            "current_price": float,
            "cost_price": float,
            "profit_margin": float,
            "total_sales": int,
            "total_revenue": float,
            "listed_at": str,
            "last_sale_at": str,
            "status": str,
            "supplier_info": str,           # JSON object
            "candidate_id": str,
        }, pk="id")

    if "orders" not in db.table_names():
        db["orders"].create({
            "id": str,
            "shopify_order_id": str,
            "shopify_order_number": str,
            "product_id": str,
            "variant_id": str,
            "quantity": int,
            "customer_email": str,
            "customer_name": str,
            "shipping_address": str,
            "sale_price": float,
            "cost_price": float,
            "profit": float,
            "status": str,
            "supplier_order_id": str,
            "tracking_number": str,
            "tracking_url": str,
            "created_at": str,
            "fulfilled_at": str,
            "delivered_at": str,
        }, pk="id")

    if "price_history" not in db.table_names():
        db["price_history"].create({
            "id": str,
            "product_id": str,
            "competitor_url": str,
            "competitor_price": float,
            "our_price": float,
            "margin_at_snapshot": float,
            "checked_at": str,
        }, pk="id")

    if "customer_messages" not in db.table_names():
        db["customer_messages"].create({
            "id": str,
            "order_id": str,
            "customer_email": str,
            "customer_name": str,
            "message_type": str,
            "subject": str,
            "body": str,
            "ai_response": str,
            "escalated": int,               # SQLite boolean
            "resolved": int,
            "received_at": str,
            "responded_at": str,
        }, pk="id")

    if "picoclaw_decisions" not in db.table_names():
        db["picoclaw_decisions"].create({
            "id": str,
            "decision_type": str,
            "context": str,
            "reasoning": str,
            "action": str,
            "parameters": str,              # JSON
            "confidence": float,
            "decided_at": str,
            "executed": int,
        }, pk="id")


def _gen_id() -> str:
    return uuid.uuid4().hex[:12]


# ─── Product Candidates ─────────────────────────────────

class ProductCandidateDB:
    def __init__(self):
        self.db = _get_db()
        self.table = self.db["product_candidates"]

    def insert(self, candidate: dict) -> str:
        """Insert a new product candidate. Returns the ID."""
        candidate_id = _gen_id()
        row = {
            "id": candidate_id,
            "source": candidate.get("source", ""),
            "source_url": candidate.get("source_url", ""),
            "title": candidate.get("title", ""),
            "description": candidate.get("description", ""),
            "category": candidate.get("category", ""),
            "tags": json.dumps(candidate.get("tags", [])),
            "supplier_price": candidate.get("supplier_price", 0),
            "suggested_retail_price": candidate.get("suggested_retail_price", 0),
            "profit_margin": candidate.get("profit_margin", 0),
            "review_score": candidate.get("review_score", 0),
            "review_count": candidate.get("review_count", 0),
            "competitor_count": candidate.get("competitor_count", 0),
            "trending_score": candidate.get("trending_score", 0),
            "image_urls": json.dumps(candidate.get("image_urls", [])),
            "supplier_info": json.dumps(candidate.get("supplier", {})),
            "discovered_at": candidate.get("discovered_at", datetime.utcnow().isoformat()),
            "status": "pending",
            "picoclaw_notes": "",
        }
        self.table.insert(row)
        return candidate_id

    def get_pending(self) -> list[dict]:
        """Get all pending product candidates."""
        return list(self.table.rows_where("status = ?", ["pending"], order_by="-trending_score"))

    def get_all(self, limit: int = 100) -> list[dict]:
        """Get all candidates."""
        return list(self.table.rows_where(limit=limit, order_by="-discovered_at"))

    def get_by_id(self, candidate_id: str) -> dict | None:
        """Get a candidate by ID."""
        try:
            return self.table.get(candidate_id)
        except Exception:
            return None

    def update_status(self, candidate_id: str, status: str, notes: str = "") -> None:
        """Update candidate status (approved/rejected/listed)."""
        update = {"status": status}
        if notes:
            update["picoclaw_notes"] = notes
        self.table.update(candidate_id, update)

    def exists_by_url(self, source_url: str) -> bool:
        """Check if we already have a candidate from this URL."""
        return len(list(self.table.rows_where("source_url = ?", [source_url]))) > 0


# ─── Active Products ────────────────────────────────────

class ActiveProductDB:
    def __init__(self):
        self.db = _get_db()
        self.table = self.db["active_products"]

    def insert(self, product: dict) -> str:
        product_id = _gen_id()
        row = {
            "id": product_id,
            "shopify_product_id": product.get("shopify_product_id", ""),
            "shopify_variant_id": product.get("shopify_variant_id", ""),
            "title": product.get("title", ""),
            "current_price": product.get("current_price", 0),
            "cost_price": product.get("cost_price", 0),
            "profit_margin": product.get("profit_margin", 0),
            "total_sales": 0,
            "total_revenue": 0.0,
            "listed_at": datetime.utcnow().isoformat(),
            "last_sale_at": "",
            "status": "active",
            "supplier_info": json.dumps(product.get("supplier", {})),
            "candidate_id": product.get("candidate_id", ""),
        }
        self.table.insert(row)
        return product_id

    def get_active(self) -> list[dict]:
        return list(self.table.rows_where("status = ?", ["active"]))

    def get_all(self) -> list[dict]:
        return list(self.table.rows_where(order_by="-listed_at"))

    def get_by_id(self, product_id: str) -> dict | None:
        try:
            return self.table.get(product_id)
        except Exception:
            return None

    def get_by_shopify_id(self, shopify_id: str) -> dict | None:
        rows = list(self.table.rows_where("shopify_product_id = ?", [shopify_id]))
        return rows[0] if rows else None

    def update_price(self, product_id: str, new_price: float, new_margin: float) -> None:
        self.table.update(product_id, {
            "current_price": new_price,
            "profit_margin": new_margin,
        })

    def record_sale(self, product_id: str, sale_amount: float) -> None:
        product = self.get_by_id(product_id)
        if product:
            self.table.update(product_id, {
                "total_sales": product["total_sales"] + 1,
                "total_revenue": product["total_revenue"] + sale_amount,
                "last_sale_at": datetime.utcnow().isoformat(),
            })

    def update_status(self, product_id: str, status: str) -> None:
        self.table.update(product_id, {"status": status})


# ─── Orders ─────────────────────────────────────────────

class OrderDB:
    def __init__(self):
        self.db = _get_db()
        self.table = self.db["orders"]

    def insert(self, order: dict) -> str:
        order_id = _gen_id()
        row = {
            "id": order_id,
            "shopify_order_id": order.get("shopify_order_id", ""),
            "shopify_order_number": order.get("shopify_order_number", ""),
            "product_id": order.get("product_id", ""),
            "variant_id": order.get("variant_id", ""),
            "quantity": order.get("quantity", 1),
            "customer_email": order.get("customer_email", ""),
            "customer_name": order.get("customer_name", ""),
            "shipping_address": order.get("shipping_address", ""),
            "sale_price": order.get("sale_price", 0),
            "cost_price": order.get("cost_price", 0),
            "profit": order.get("sale_price", 0) - order.get("cost_price", 0),
            "status": "pending",
            "supplier_order_id": "",
            "tracking_number": "",
            "tracking_url": "",
            "created_at": datetime.utcnow().isoformat(),
            "fulfilled_at": "",
            "delivered_at": "",
        }
        self.table.insert(row)
        return order_id

    def get_pending(self) -> list[dict]:
        return list(self.table.rows_where("status = ?", ["pending"]))

    def get_all(self, limit: int = 100) -> list[dict]:
        return list(self.table.rows_where(limit=limit, order_by="-created_at"))

    def get_by_id(self, order_id: str) -> dict | None:
        try:
            return self.table.get(order_id)
        except Exception:
            return None

    def update_status(self, order_id: str, status: str, **kwargs) -> None:
        update = {"status": status}
        update.update(kwargs)
        self.table.update(order_id, update)

    def get_stats(self) -> dict:
        """Get order statistics."""
        all_orders = list(self.table.rows)
        total_revenue = sum(o["sale_price"] for o in all_orders)
        total_profit = sum(o["profit"] for o in all_orders)
        today = datetime.utcnow().date().isoformat()
        today_orders = [o for o in all_orders if o["created_at"].startswith(today)]
        return {
            "total_orders": len(all_orders),
            "total_revenue": total_revenue,
            "total_profit": total_profit,
            "orders_today": len(today_orders),
            "revenue_today": sum(o["sale_price"] for o in today_orders),
            "profit_today": sum(o["profit"] for o in today_orders),
            "pending_count": len([o for o in all_orders if o["status"] == "pending"]),
            "shipped_count": len([o for o in all_orders if o["status"] == "shipped"]),
        }


# ─── Price History ───────────────────────────────────────

class PriceHistoryDB:
    def __init__(self):
        self.db = _get_db()
        self.table = self.db["price_history"]

    def insert(self, price_point: dict) -> str:
        point_id = _gen_id()
        row = {
            "id": point_id,
            "product_id": price_point.get("product_id", ""),
            "competitor_url": price_point.get("competitor_url", ""),
            "competitor_price": price_point.get("competitor_price", 0),
            "our_price": price_point.get("our_price", 0),
            "margin_at_snapshot": price_point.get("margin_at_snapshot", 0),
            "checked_at": datetime.utcnow().isoformat(),
        }
        self.table.insert(row)
        return point_id

    def get_history(self, product_id: str, limit: int = 50) -> list[dict]:
        return list(self.table.rows_where(
            "product_id = ?", [product_id],
            order_by="-checked_at", limit=limit
        ))


# ─── PicoClaw Decisions ─────────────────────────────────

class PicoClawDecisionDB:
    def __init__(self):
        self.db = _get_db()
        self.table = self.db["picoclaw_decisions"]

    def insert(self, decision: dict) -> str:
        decision_id = _gen_id()
        row = {
            "id": decision_id,
            "decision_type": decision.get("decision_type", ""),
            "context": decision.get("context", ""),
            "reasoning": decision.get("reasoning", ""),
            "action": decision.get("action", ""),
            "parameters": json.dumps(decision.get("parameters", {})),
            "confidence": decision.get("confidence", 0),
            "decided_at": datetime.utcnow().isoformat(),
            "executed": 0,
        }
        self.table.insert(row)
        return decision_id

    def mark_executed(self, decision_id: str) -> None:
        self.table.update(decision_id, {"executed": 1})

    def get_recent(self, limit: int = 20) -> list[dict]:
        return list(self.table.rows_where(order_by="-decided_at", limit=limit))
