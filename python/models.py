"""
Pydantic data models for the entire dropshipping pipeline.
Shared across scraper, API, database, and PicoClaw.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, HttpUrl


# ─── Enums ──────────────────────────────────────────────

class ProductSource(str, Enum):
    TIKTOK_SHOP = "tiktok_shop"
    AMAZON_MOVERS = "amazon_movers"
    ALIEXPRESS_TRENDING = "aliexpress_trending"
    MANUAL = "manual"


class OrderStatus(str, Enum):
    PENDING = "pending"
    PLACED_WITH_SUPPLIER = "placed_with_supplier"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"
    REFUNDED = "refunded"


class DecisionType(str, Enum):
    LIST_PRODUCT = "list_product"
    REMOVE_PRODUCT = "remove_product"
    ADJUST_PRICE = "adjust_price"
    HANDLE_COMPLAINT = "handle_complaint"
    RESTOCK = "restock"
    ESCALATE = "escalate"


class CustomerMessageType(str, Enum):
    ORDER_STATUS = "order_status"
    SHIPPING_INQUIRY = "shipping_inquiry"
    RETURN_REQUEST = "return_request"
    COMPLAINT = "complaint"
    GENERAL = "general"


# ─── Product Models ─────────────────────────────────────

class SupplierInfo(BaseModel):
    """Supplier details for a product."""
    platform: str                          # e.g. "aliexpress", "cj_dropshipping"
    product_url: str
    supplier_price: float                  # cost price in USD
    shipping_cost: float = 0.0
    estimated_shipping_days: int = 10
    supplier_rating: float = 0.0
    supplier_id: str = ""


class ProductCandidate(BaseModel):
    """A product candidate discovered by the scraper, awaiting PicoClaw approval."""
    id: Optional[str] = None               # set after DB insert
    source: ProductSource
    source_url: str
    title: str
    description: str = ""
    category: str = ""
    tags: list[str] = Field(default_factory=list)

    # Pricing
    supplier_price: float                   # what we pay
    suggested_retail_price: float           # what we sell for
    profit_margin: float                    # calculated margin

    # Quality signals
    review_score: float = 0.0
    review_count: int = 0
    competitor_count: int = 0
    trending_score: float = 0.0            # 0-100, how "hot" the product is

    # Media
    image_urls: list[str] = Field(default_factory=list)

    # Supplier
    supplier: SupplierInfo

    # Metadata
    discovered_at: datetime = Field(default_factory=datetime.utcnow)
    status: str = "pending"                 # pending | approved | rejected | listed
    picoclaw_notes: str = ""               # PicoClaw's reasoning


class ActiveProduct(BaseModel):
    """A product currently listed on Shopify."""
    id: str                                 # internal DB id
    shopify_product_id: str                 # Shopify GID
    shopify_variant_id: str = ""
    title: str
    current_price: float
    cost_price: float
    profit_margin: float
    total_sales: int = 0
    total_revenue: float = 0.0
    listed_at: datetime = Field(default_factory=datetime.utcnow)
    last_sale_at: Optional[datetime] = None
    status: str = "active"                  # active | paused | removed
    supplier: SupplierInfo
    candidate_id: str = ""                  # link back to original candidate


# ─── Price Models ────────────────────────────────────────

class PricePoint(BaseModel):
    """A competitor price snapshot."""
    product_id: str
    competitor_url: str
    competitor_price: float
    our_price: float
    margin_at_snapshot: float
    checked_at: datetime = Field(default_factory=datetime.utcnow)


class PriceUpdateRequest(BaseModel):
    """Request to update a product's price."""
    product_id: str
    shopify_product_id: str
    new_price: float
    reason: str                             # "competitor_undercut", "margin_optimization", "manual"
    old_price: float = 0.0


# ─── Order Models ────────────────────────────────────────

class Order(BaseModel):
    """An order from Shopify that needs fulfillment."""
    id: Optional[str] = None
    shopify_order_id: str
    shopify_order_number: str = ""
    product_id: str
    variant_id: str = ""
    quantity: int = 1
    customer_email: str = ""
    customer_name: str = ""
    shipping_address: str = ""

    # Pricing
    sale_price: float
    cost_price: float
    profit: float = 0.0

    # Fulfillment
    status: OrderStatus = OrderStatus.PENDING
    supplier_order_id: str = ""
    tracking_number: str = ""
    tracking_url: str = ""

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    fulfilled_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


# ─── Customer Service Models ────────────────────────────

class CustomerMessage(BaseModel):
    """An incoming customer message."""
    id: Optional[str] = None
    order_id: str = ""
    customer_email: str
    customer_name: str = ""
    message_type: CustomerMessageType = CustomerMessageType.GENERAL
    subject: str = ""
    body: str
    ai_response: str = ""
    escalated: bool = False
    resolved: bool = False
    received_at: datetime = Field(default_factory=datetime.utcnow)
    responded_at: Optional[datetime] = None


# ─── PicoClaw Models ────────────────────────────────────

class PicoClawDecision(BaseModel):
    """A decision made by PicoClaw."""
    id: Optional[str] = None
    decision_type: DecisionType
    context: str                            # what was the situation
    reasoning: str                          # PicoClaw's reasoning
    action: str                             # what action to take
    parameters: dict = Field(default_factory=dict)  # action-specific params
    confidence: float = 0.0                 # 0-1 confidence score
    decided_at: datetime = Field(default_factory=datetime.utcnow)
    executed: bool = False


# ─── Dashboard / Stats Models ───────────────────────────

class DashboardStats(BaseModel):
    """Aggregated stats for the dashboard."""
    total_revenue: float = 0.0
    total_profit: float = 0.0
    total_orders: int = 0
    active_listings: int = 0
    pending_candidates: int = 0
    orders_pending: int = 0
    orders_shipped: int = 0
    avg_profit_margin: float = 0.0
    revenue_today: float = 0.0
    profit_today: float = 0.0
    orders_today: int = 0
    top_products: list[dict] = Field(default_factory=list)


class DailyReport(BaseModel):
    """Daily summary sent to Discord."""
    date: str
    revenue: float = 0.0
    profit: float = 0.0
    orders: int = 0
    new_listings: int = 0
    products_removed: int = 0
    trending_found: int = 0
    top_seller: str = ""
    alerts: list[str] = Field(default_factory=list)
