"""
Centralized configuration loader.
Reads .env file and exports a typed Config dataclass with validation.
"""

import os
import sys
from dataclasses import dataclass, field
from pathlib import Path
from dotenv import load_dotenv

# Load .env from project root
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")


@dataclass(frozen=True)
class ShopifyConfig:
    store_domain: str
    access_token: str
    api_version: str = "2025-01"

    @property
    def graphql_url(self) -> str:
        return f"https://{self.store_domain}/admin/api/{self.api_version}/graphql.json"

    @property
    def headers(self) -> dict[str, str]:
        return {
            "X-Shopify-Access-Token": self.access_token,
            "Content-Type": "application/json",
        }


@dataclass(frozen=True)
class DiscordConfig:
    bot_token: str
    client_id: str
    guild_id: str
    channel_id: str


@dataclass(frozen=True)
class LLMConfig:
    provider: str  # "openai" | "anthropic" | "ollama"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    ollama_base_url: str = "http://localhost:11434"


@dataclass(frozen=True)
class ScraperConfig:
    min_profit_margin: float = 0.30
    max_shipping_days: int = 15
    min_review_score: float = 4.0
    min_review_count: int = 50
    max_competitor_count: int = 20
    scrape_interval_hours: int = 6


@dataclass(frozen=True)
class PriceMonitorConfig:
    check_interval_minutes: int = 15
    min_margin_threshold: float = 0.20


@dataclass(frozen=True)
class Config:
    shopify: ShopifyConfig
    discord: DiscordConfig
    llm: LLMConfig
    scraper: ScraperConfig
    price_monitor: PriceMonitorConfig
    database_path: str
    log_level: str
    api_port: int
    dashboard_port: int
    picoclaw_enabled: bool
    picoclaw_config_path: str
    supplier_platform: str


def _env(key: str, default: str | None = None, required: bool = True) -> str:
    """Get an environment variable with optional default and validation."""
    value = os.getenv(key, default)
    if required and not value:
        print(f"❌ Missing required environment variable: {key}", file=sys.stderr)
        print(f"   Please set it in your .env file.", file=sys.stderr)
        sys.exit(1)
    return value or ""


def load_config() -> Config:
    """Load and validate all configuration from environment variables."""
    return Config(
        shopify=ShopifyConfig(
            store_domain=_env("SHOPIFY_STORE_DOMAIN"),
            access_token=_env("SHOPIFY_ACCESS_TOKEN"),
            api_version=_env("SHOPIFY_API_VERSION", "2025-01"),
        ),
        discord=DiscordConfig(
            bot_token=_env("DISCORD_BOT_TOKEN"),
            client_id=_env("DISCORD_CLIENT_ID"),
            guild_id=_env("DISCORD_GUILD_ID"),
            channel_id=_env("DISCORD_CHANNEL_ID"),
        ),
        llm=LLMConfig(
            provider=_env("LLM_PROVIDER", "openai"),
            openai_api_key=_env("OPENAI_API_KEY", "", required=False),
            anthropic_api_key=_env("ANTHROPIC_API_KEY", "", required=False),
            ollama_base_url=_env("OLLAMA_BASE_URL", "http://localhost:11434", required=False),
        ),
        scraper=ScraperConfig(
            min_profit_margin=float(_env("MIN_PROFIT_MARGIN", "0.30")),
            max_shipping_days=int(_env("MAX_SHIPPING_DAYS", "15")),
            min_review_score=float(_env("MIN_REVIEW_SCORE", "4.0")),
            min_review_count=int(_env("MIN_REVIEW_COUNT", "50")),
            max_competitor_count=int(_env("MAX_COMPETITOR_COUNT", "20")),
            scrape_interval_hours=int(_env("SCRAPE_INTERVAL_HOURS", "6")),
        ),
        price_monitor=PriceMonitorConfig(
            check_interval_minutes=int(_env("PRICE_CHECK_INTERVAL_MINUTES", "15")),
            min_margin_threshold=float(_env("MIN_MARGIN_THRESHOLD", "0.20")),
        ),
        database_path=_env("DATABASE_PATH", "./data/dropbot.db"),
        log_level=_env("LOG_LEVEL", "INFO"),
        api_port=int(_env("API_PORT", "3001")),
        dashboard_port=int(_env("DASHBOARD_PORT", "5173")),
        picoclaw_enabled=_env("PICOCLAW_ENABLED", "true").lower() == "true",
        picoclaw_config_path=_env("PICOCLAW_CONFIG_PATH", "~/.picoclaw/config.json", required=False),
        supplier_platform=_env("SUPPLIER_PLATFORM", "aliexpress"),
    )


# Singleton config instance — import this
config = load_config()
