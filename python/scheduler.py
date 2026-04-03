"""
APScheduler-based task orchestrator.
Runs all automated tasks on defined schedules.
"""

import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger

from python.config import config
from python.scraper import run_scraper
from python.orders import OrderManager
from python.customer import CustomerServiceAgent
from python.ai_utils import AIEngine
from python.db import ActiveProductDB, OrderDB

logger = logging.getLogger("dropbot.scheduler")


class DropBotScheduler:
    """
    Central task orchestrator — runs all automated jobs on schedule.
    """

    def __init__(self):
        self.scheduler = AsyncIOScheduler()
        self.ai = AIEngine(config)
        self.order_manager = OrderManager(config)
        self.customer_agent = CustomerServiceAgent(config)
        self._setup_jobs()

    def _setup_jobs(self):
        """Configure all scheduled jobs."""

        # ─── Product Scraping (every 6 hours) ───────────
        self.scheduler.add_job(
            self._job_scrape_products,
            IntervalTrigger(hours=config.scraper.scrape_interval_hours),
            id="scrape_products",
            name="Product Scraper",
            max_instances=1,
            next_run_time=datetime.now(),  # Run immediately on start
        )

        # ─── Order Processing (every hour) ──────────────
        self.scheduler.add_job(
            self._job_process_orders,
            IntervalTrigger(hours=1),
            id="process_orders",
            name="Order Processor",
            max_instances=1,
        )

        # ─── Order Fulfillment (every 2 hours) ─────────
        self.scheduler.add_job(
            self._job_fulfill_orders,
            IntervalTrigger(hours=2),
            id="fulfill_orders",
            name="Order Fulfillment",
            max_instances=1,
        )

        # ─── Tracking Updates (every 4 hours) ──────────
        self.scheduler.add_job(
            self._job_update_tracking,
            IntervalTrigger(hours=4),
            id="update_tracking",
            name="Tracking Updates",
            max_instances=1,
        )

        # ─── Customer Service (every 30 minutes) ───────
        self.scheduler.add_job(
            self._job_customer_service,
            IntervalTrigger(minutes=30),
            id="customer_service",
            name="Customer Service",
            max_instances=1,
        )

        # ─── Daily Report (midnight UTC) ────────────────
        self.scheduler.add_job(
            self._job_daily_report,
            CronTrigger(hour=0, minute=0),
            id="daily_report",
            name="Daily Report",
            max_instances=1,
        )

        # ─── Performance Analysis (weekly, Sunday midnight)
        self.scheduler.add_job(
            self._job_weekly_analysis,
            CronTrigger(day_of_week="sun", hour=0, minute=30),
            id="weekly_analysis",
            name="Weekly Analysis",
            max_instances=1,
        )

    def start(self):
        """Start the scheduler."""
        logger.info("🚀 Starting DropBot Scheduler")
        logger.info(f"   Scrape interval: every {config.scraper.scrape_interval_hours}h")
        logger.info(f"   Min margin: {config.scraper.min_profit_margin:.0%}")
        self.scheduler.start()

    def stop(self):
        """Stop the scheduler."""
        logger.info("⏹️  Stopping DropBot Scheduler")
        self.scheduler.shutdown()

    # ─── Job Implementations ────────────────────────────

    async def _job_scrape_products(self):
        """Scrape for trending products and notify via Discord."""
        logger.info("═" * 50)
        logger.info("🔍 [SCHEDULED] Running product scrape...")
        try:
            candidates = await run_scraper(config)

            if candidates:
                # Format for PicoClaw / Discord
                report = self.ai.format_for_picoclaw(candidates)

                # Send to Discord (if configured)
                if config.discord.guild_id and config.discord.channel_id:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"http://localhost:{config.api_port}/api/discord/notify",
                            json={"message": report},
                        )

                logger.info(f"✅ Scrape complete: {len(candidates)} new candidates")
            else:
                logger.info("✅ Scrape complete: no new candidates")

        except Exception as e:
            logger.error(f"❌ Scrape job failed: {e}")

    async def _job_process_orders(self):
        """Check for and process new orders."""
        logger.info("📋 [SCHEDULED] Processing new orders...")
        try:
            count = await self.order_manager.process_new_orders()
            logger.info(f"✅ Processed {count} new orders")
        except Exception as e:
            logger.error(f"❌ Order processing failed: {e}")

    async def _job_fulfill_orders(self):
        """Fulfill pending orders with suppliers."""
        logger.info("🚚 [SCHEDULED] Fulfilling orders...")
        try:
            count = await self.order_manager.fulfill_pending_orders()
            logger.info(f"✅ Fulfilled {count} orders")
        except Exception as e:
            logger.error(f"❌ Order fulfillment failed: {e}")

    async def _job_update_tracking(self):
        """Check for tracking updates."""
        logger.info("📡 [SCHEDULED] Checking tracking updates...")
        try:
            count = await self.order_manager.update_tracking()
            logger.info(f"✅ Updated {count} tracking entries")
        except Exception as e:
            logger.error(f"❌ Tracking update failed: {e}")

    async def _job_customer_service(self):
        """Process customer messages."""
        logger.info("💬 [SCHEDULED] Processing customer messages...")
        try:
            count = await self.customer_agent.process_messages()
            logger.info(f"✅ Handled {count} messages")
        except Exception as e:
            logger.error(f"❌ Customer service failed: {e}")

    async def _job_daily_report(self):
        """Generate and send daily report to Discord."""
        logger.info("📊 [SCHEDULED] Generating daily report...")
        try:
            order_stats = self.order_manager.get_order_stats()
            product_db = ActiveProductDB()
            active_products = product_db.get_active()

            stats = {
                **order_stats,
                "active_listings": len(active_products),
            }

            report = self.ai.format_daily_report(stats)

            if config.discord.guild_id and config.discord.channel_id:
                import httpx
                async with httpx.AsyncClient() as client:
                    await client.post(
                        f"http://localhost:{config.api_port}/api/discord/notify",
                        json={"message": report},
                    )

            logger.info("✅ Daily report sent")

        except Exception as e:
            logger.error(f"❌ Daily report failed: {e}")

    async def _job_weekly_analysis(self):
        """Analyze product performance and suggest removals."""
        logger.info("📈 [SCHEDULED] Running weekly analysis...")
        try:
            product_db = ActiveProductDB()
            active = product_db.get_active()

            underperformers = []
            for product in active:
                # Flag products with no sales in the last 2 weeks
                if product["total_sales"] == 0:
                    underperformers.append(product)
                # Flag products with very low margin
                elif product["profit_margin"] < config.price_monitor.min_margin_threshold:
                    underperformers.append(product)

            if underperformers:
                report_lines = ["📉 **Weekly Analysis — Underperforming Products**\n"]
                for p in underperformers:
                    report_lines.append(
                        f"• **{p['title'][:50]}** — "
                        f"Sales: {p['total_sales']}, "
                        f"Margin: {p['profit_margin']:.0%}"
                    )
                report_lines.append(
                    "\nConsider removing these products to keep the store lean."
                )

                if config.discord.guild_id and config.discord.channel_id:
                    import httpx
                    async with httpx.AsyncClient() as client:
                        await client.post(
                            f"http://localhost:{config.api_port}/api/discord/notify",
                            json={"message": "\n".join(report_lines)},
                        )

            logger.info(f"✅ Weekly analysis: {len(underperformers)} underperformers flagged")

        except Exception as e:
            logger.error(f"❌ Weekly analysis failed: {e}")


if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(
        level=config.log_level or "INFO",
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        handlers=[
            logging.FileHandler("dropbot.log"),
            logging.StreamHandler()
        ]
    )

    async def main():
        """Main entry point for the scheduler."""
        scheduler = DropBotScheduler()
        scheduler.start()
        
        try:
            # Keep the main task running
            while True:
                await asyncio.sleep(1)
        except (KeyboardInterrupt, SystemExit):
            scheduler.stop()

    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        pass
