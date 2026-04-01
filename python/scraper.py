"""
Multi-source product scraping engine.
Finds trending products from TikTok Shop, Amazon Movers & Shakers, and AliExpress.
Filters by profit margin, shipping time, reviews, and competition.
"""

import asyncio
import json
import logging
import re
from datetime import datetime
from typing import Optional
from urllib.parse import quote_plus

import httpx
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential

from python.db import ProductCandidateDB
from python.models import ProductCandidate, ProductSource, SupplierInfo

logger = logging.getLogger("dropbot.scraper")


class ProductScraper:
    """
    Scrapes multiple sources for trending products and filters
    them through a quality pipeline before storing candidates.
    """

    def __init__(self, config):
        self.config = config
        self.sc = config.scraper
        self.db = ProductCandidateDB()
        self.client = httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/122.0.0.0 Safari/537.36"
                )
            },
        )

    async def close(self):
        await self.client.aclose()

    # ─── Main Entry Point ───────────────────────────────

    async def run_full_scrape(self) -> list[ProductCandidate]:
        """
        Run all scrapers, filter results, and store candidates.
        Returns the list of new candidates found.
        """
        logger.info("🔍 Starting full product scrape...")
        all_candidates: list[ProductCandidate] = []

        # Run scrapers concurrently
        results = await asyncio.gather(
            self._scrape_amazon_movers(),
            self._scrape_aliexpress_trending(),
            self._scrape_tiktok_trending(),
            return_exceptions=True,
        )

        for i, result in enumerate(results):
            source_names = ["Amazon", "AliExpress", "TikTok"]
            if isinstance(result, Exception):
                logger.error(f"❌ {source_names[i]} scraper failed: {result}")
            else:
                logger.info(f"✅ {source_names[i]}: found {len(result)} raw products")
                all_candidates.extend(result)

        # Filter pipeline
        filtered = self._filter_candidates(all_candidates)
        logger.info(f"📊 After filtering: {len(filtered)}/{len(all_candidates)} passed")

        # Store new candidates (skip duplicates)
        new_candidates = []
        for candidate in filtered:
            if not self.db.exists_by_url(candidate.source_url):
                candidate_dict = candidate.model_dump()
                candidate_dict["supplier"] = candidate.supplier.model_dump()
                cid = self.db.insert(candidate_dict)
                candidate.id = cid
                new_candidates.append(candidate)
                logger.info(f"  📦 New: {candidate.title[:50]}... (margin: {candidate.profit_margin:.0%})")

        logger.info(f"🆕 {len(new_candidates)} new candidates stored")
        return new_candidates

    # ─── Amazon Movers & Shakers ────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def _scrape_amazon_movers(self) -> list[ProductCandidate]:
        """
        Scrape Amazon Movers & Shakers for trending products.
        Uses the public-facing pages — no API needed.
        """
        candidates = []
        categories = [
            "electronics",
            "home-garden",
            "toys-and-games",
            "sports-and-outdoors",
            "beauty",
        ]

        for category in categories:
            try:
                url = f"https://www.amazon.com/gp/movers-and-shakers/{category}"
                resp = await self.client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"Amazon {category}: HTTP {resp.status_code}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")
                items = soup.select("[data-asin]")

                for item in items[:20]:  # Top 20 per category
                    try:
                        candidate = self._parse_amazon_item(item, category)
                        if candidate:
                            candidates.append(candidate)
                    except Exception as e:
                        logger.debug(f"Failed to parse Amazon item: {e}")

                # Polite delay between categories
                await asyncio.sleep(2)

            except Exception as e:
                logger.error(f"Amazon {category} scrape error: {e}")

        return candidates

    def _parse_amazon_item(self, item, category: str) -> Optional[ProductCandidate]:
        """Parse a single Amazon Movers & Shakers item."""
        asin = item.get("data-asin", "")
        if not asin:
            return None

        # Extract title
        title_el = item.select_one(".p13n-sc-truncate, ._cDEzb_p13n-sc-css-line-clamp-1_1Fn1y")
        title = title_el.get_text(strip=True) if title_el else ""
        if not title:
            return None

        # Extract price
        price_el = item.select_one(".p13n-sc-price, ._cDEzb_p13n-sc-price_3mJ9Z")
        price_text = price_el.get_text(strip=True) if price_el else ""
        retail_price = self._parse_price(price_text)
        if not retail_price or retail_price < 5:
            return None

        # Extract rating
        rating_el = item.select_one(".a-icon-alt")
        rating_text = rating_el.get_text(strip=True) if rating_el else ""
        rating = 0.0
        if rating_text:
            match = re.search(r"([\d.]+)\s*out of", rating_text)
            if match:
                rating = float(match.group(1))

        # Extract image
        img_el = item.select_one("img")
        image_url = img_el.get("src", "") if img_el else ""

        # Estimate supplier cost (typically 30-50% of Amazon retail for dropship)
        estimated_supplier_price = retail_price * 0.35

        # Calculate markup for our store
        our_price = retail_price * 0.85  # Slightly undercut Amazon
        margin = (our_price - estimated_supplier_price) / our_price

        return ProductCandidate(
            source=ProductSource.AMAZON_MOVERS,
            source_url=f"https://www.amazon.com/dp/{asin}",
            title=title,
            category=category,
            supplier_price=round(estimated_supplier_price, 2),
            suggested_retail_price=round(our_price, 2),
            profit_margin=round(margin, 3),
            review_score=rating,
            review_count=100,  # Amazon M&S products generally have many reviews
            trending_score=75.0,  # Base score for being on Movers & Shakers
            image_urls=[image_url] if image_url else [],
            supplier=SupplierInfo(
                platform="aliexpress",
                product_url="",  # To be matched later
                supplier_price=round(estimated_supplier_price, 2),
                shipping_cost=0,
                estimated_shipping_days=12,
            ),
        )

    # ─── AliExpress Trending ────────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def _scrape_aliexpress_trending(self) -> list[ProductCandidate]:
        """
        Scrape AliExpress trending/bestseller products.
        """
        candidates = []
        categories = [
            "consumer-electronics",
            "phones-accessories",
            "computer-office",
            "home-garden",
            "toys-hobbies",
        ]

        for category in categories:
            try:
                url = f"https://www.aliexpress.com/category/{category}.html"
                resp = await self.client.get(url)
                if resp.status_code != 200:
                    logger.warning(f"AliExpress {category}: HTTP {resp.status_code}")
                    continue

                soup = BeautifulSoup(resp.text, "lxml")

                # AliExpress product cards
                product_cards = soup.select(
                    "[class*='product-card'], [class*='SearchProduct'], .list--gallery--C2f2tvm"
                )

                for card in product_cards[:15]:
                    try:
                        candidate = self._parse_aliexpress_card(card, category)
                        if candidate:
                            candidates.append(candidate)
                    except Exception as e:
                        logger.debug(f"Failed to parse AliExpress card: {e}")

                await asyncio.sleep(3)  # Be polite

            except Exception as e:
                logger.error(f"AliExpress {category} scrape error: {e}")

        return candidates

    def _parse_aliexpress_card(self, card, category: str) -> Optional[ProductCandidate]:
        """Parse a single AliExpress product card."""
        # Title
        title_el = card.select_one("[class*='title'], a[title]")
        title = ""
        if title_el:
            title = title_el.get("title", "") or title_el.get_text(strip=True)
        if not title:
            return None

        # Link
        link_el = card.select_one("a[href*='/item/']")
        product_url = ""
        if link_el:
            href = link_el.get("href", "")
            if href.startswith("//"):
                href = "https:" + href
            elif href.startswith("/"):
                href = "https://www.aliexpress.com" + href
            product_url = href

        # Price
        price_el = card.select_one("[class*='price'], [class*='Price']")
        price_text = price_el.get_text(strip=True) if price_el else ""
        supplier_price = self._parse_price(price_text)
        if not supplier_price or supplier_price < 1:
            return None

        # Image
        img_el = card.select_one("img")
        image_url = ""
        if img_el:
            image_url = img_el.get("src", "") or img_el.get("data-src", "")
            if image_url.startswith("//"):
                image_url = "https:" + image_url

        # Rating
        rating_el = card.select_one("[class*='star'], [class*='rating']")
        rating = 4.5  # Default for trending items
        if rating_el:
            rating_text = rating_el.get_text(strip=True)
            match = re.search(r"([\d.]+)", rating_text)
            if match:
                rating = float(match.group(1))

        # Orders / popularity
        orders_el = card.select_one("[class*='sold'], [class*='order']")
        order_count = 100
        if orders_el:
            orders_text = orders_el.get_text(strip=True)
            match = re.search(r"([\d,]+)", orders_text)
            if match:
                order_count = int(match.group(1).replace(",", ""))

        # Calculate pricing — target 2.5-3x markup for dropshipping
        our_price = round(supplier_price * 2.8, 2)
        margin = (our_price - supplier_price) / our_price

        trending_score = min(95, 50 + (order_count / 100))

        return ProductCandidate(
            source=ProductSource.ALIEXPRESS_TRENDING,
            source_url=product_url,
            title=title,
            category=category,
            supplier_price=round(supplier_price, 2),
            suggested_retail_price=our_price,
            profit_margin=round(margin, 3),
            review_score=rating,
            review_count=order_count,
            trending_score=trending_score,
            image_urls=[image_url] if image_url else [],
            supplier=SupplierInfo(
                platform="aliexpress",
                product_url=product_url,
                supplier_price=round(supplier_price, 2),
                shipping_cost=0,
                estimated_shipping_days=12,
            ),
        )

    # ─── TikTok Shop Trending ───────────────────────────

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
    async def _scrape_tiktok_trending(self) -> list[ProductCandidate]:
        """
        Scrape TikTok Shop trending products.
        TikTok Shop is heavily JS-rendered, so we use their API endpoints where possible.
        """
        candidates = []

        try:
            # TikTok Shop search API for trending categories
            trending_queries = [
                "viral gadgets",
                "trending home",
                "tiktok made me buy it",
                "must have tech",
                "aesthetic finds",
            ]

            for query in trending_queries:
                try:
                    encoded = quote_plus(query)
                    url = f"https://www.tiktok.com/api/search/general/full/?keyword={encoded}&search_source=normal_search"
                    resp = await self.client.get(url)

                    if resp.status_code == 200:
                        try:
                            data = resp.json()
                            items = data.get("data", [])
                            for item in items[:10]:
                                candidate = self._parse_tiktok_item(item, query)
                                if candidate:
                                    candidates.append(candidate)
                        except json.JSONDecodeError:
                            # Fallback: parse HTML
                            soup = BeautifulSoup(resp.text, "lxml")
                            product_links = soup.select("a[href*='/product/']")
                            for link in product_links[:10]:
                                title = link.get_text(strip=True)
                                href = link.get("href", "")
                                if title and href:
                                    candidates.append(
                                        ProductCandidate(
                                            source=ProductSource.TIKTOK_SHOP,
                                            source_url=href if href.startswith("http") else f"https://www.tiktok.com{href}",
                                            title=title,
                                            category=query,
                                            supplier_price=10.0,
                                            suggested_retail_price=29.99,
                                            profit_margin=0.67,
                                            trending_score=85.0,
                                            supplier=SupplierInfo(
                                                platform="tiktok_shop",
                                                product_url=href,
                                                supplier_price=10.0,
                                            ),
                                        )
                                    )

                    await asyncio.sleep(3)

                except Exception as e:
                    logger.debug(f"TikTok query '{query}' failed: {e}")

        except Exception as e:
            logger.error(f"TikTok scrape error: {e}")

        return candidates

    def _parse_tiktok_item(self, item: dict, query: str) -> Optional[ProductCandidate]:
        """Parse a TikTok Shop search result item."""
        try:
            # TikTok API structure varies — handle gracefully
            product_info = item.get("product", item.get("item", {}))
            if not product_info:
                return None

            title = product_info.get("title", "")
            if not title:
                return None

            price = product_info.get("price", {})
            supplier_price = float(price.get("original_price", price.get("price", 0))) / 100
            if supplier_price < 1:
                return None

            our_price = round(supplier_price * 2.5, 2)
            margin = (our_price - supplier_price) / our_price

            image_url = product_info.get("cover", {}).get("url_list", [""])[0]
            product_url = f"https://www.tiktok.com/product/{product_info.get('id', '')}"

            return ProductCandidate(
                source=ProductSource.TIKTOK_SHOP,
                source_url=product_url,
                title=title,
                category=query,
                supplier_price=round(supplier_price, 2),
                suggested_retail_price=our_price,
                profit_margin=round(margin, 3),
                review_score=4.5,
                review_count=int(product_info.get("sold_count", 50)),
                trending_score=90.0,
                image_urls=[image_url] if image_url else [],
                supplier=SupplierInfo(
                    platform="tiktok_shop",
                    product_url=product_url,
                    supplier_price=round(supplier_price, 2),
                    estimated_shipping_days=7,
                ),
            )
        except Exception:
            return None

    # ─── Filter Pipeline ────────────────────────────────

    def _filter_candidates(self, candidates: list[ProductCandidate]) -> list[ProductCandidate]:
        """
        Apply the quality filter pipeline:
        1. Minimum profit margin
        2. Maximum shipping time
        3. Minimum review score
        4. Minimum review count
        5. Maximum competitor count
        """
        filtered = []

        for c in candidates:
            # 1. Profit margin check
            if c.profit_margin < self.sc.min_profit_margin:
                logger.debug(f"  ❌ Low margin ({c.profit_margin:.0%}): {c.title[:40]}")
                continue

            # 2. Shipping time check
            if c.supplier.estimated_shipping_days > self.sc.max_shipping_days:
                logger.debug(f"  ❌ Slow shipping ({c.supplier.estimated_shipping_days}d): {c.title[:40]}")
                continue

            # 3. Review score check
            if c.review_score < self.sc.min_review_score:
                logger.debug(f"  ❌ Low reviews ({c.review_score}★): {c.title[:40]}")
                continue

            # 4. Review count check
            if c.review_count < self.sc.min_review_count:
                logger.debug(f"  ❌ Few reviews ({c.review_count}): {c.title[:40]}")
                continue

            # 5. Competition check (placeholder — real impl would query Shopify search)
            if c.competitor_count > self.sc.max_competitor_count:
                logger.debug(f"  ❌ Too many competitors ({c.competitor_count}): {c.title[:40]}")
                continue

            filtered.append(c)

        return filtered

    # ─── Search by Query ────────────────────────────────

    async def search_products(self, query: str, max_price: float = 0) -> list[ProductCandidate]:
        """
        Search for products matching a specific query.
        Used by Discord commands like "/trending gaming 20".
        """
        logger.info(f"🔍 Searching for: {query} (max: ${max_price or 'any'})")
        candidates = []

        # Search AliExpress
        try:
            encoded = quote_plus(query)
            url = f"https://www.aliexpress.com/wholesale?SearchText={encoded}"
            resp = await self.client.get(url)
            if resp.status_code == 200:
                soup = BeautifulSoup(resp.text, "lxml")
                cards = soup.select("[class*='product-card'], [class*='SearchProduct']")
                for card in cards[:20]:
                    candidate = self._parse_aliexpress_card(card, query)
                    if candidate:
                        if max_price > 0 and candidate.suggested_retail_price > max_price:
                            continue
                        candidates.append(candidate)
        except Exception as e:
            logger.error(f"Search scrape error: {e}")

        filtered = self._filter_candidates(candidates)
        logger.info(f"  Found {len(filtered)} matching products")
        return filtered

    # ─── Utilities ──────────────────────────────────────

    @staticmethod
    def _parse_price(price_text: str) -> float:
        """Extract a numeric price from text like '$19.99' or 'US $12.34'."""
        if not price_text:
            return 0.0
        # Remove currency symbols and text, keep numbers and dots
        cleaned = re.sub(r"[^\d.]", "", price_text.split("-")[0].strip())
        try:
            return float(cleaned)
        except ValueError:
            return 0.0


# ─── Convenience function ───────────────────────────────

async def run_scraper(config) -> list[ProductCandidate]:
    """Run the full scraper pipeline. Call this from the scheduler."""
    scraper = ProductScraper(config)
    try:
        return await scraper.run_full_scrape()
    finally:
        await scraper.close()
