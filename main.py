#!/usr/bin/env python3
"""
DropBot — AI Dropshipping Automation Bot
Entry point: starts all services (API, scheduler, price monitor).

Usage:
    python main.py          # Start everything
    python main.py --api    # Start only the REST API
    python main.py --scrape # Run a single scrape cycle
"""

import argparse
import asyncio
import logging
import os
import signal
import subprocess
import sys
from pathlib import Path

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(name)s] %(levelname)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("dropbot")

# Project root
PROJECT_ROOT = Path(__file__).parent


def banner():
    print("""
    ╔══════════════════════════════════════════════════╗
    ║                                                  ║
    ║   🤖  DropBot — AI Dropshipping Automation       ║
    ║                                                  ║
    ║   Stack: Python · TypeScript · C · PicoClaw      ║
    ║   Platform: Raspberry Pi 5                       ║
    ║                                                  ║
    ╚══════════════════════════════════════════════════╝
    """)


class DropBot:
    """Main orchestrator — manages all child processes and the Python scheduler."""

    def __init__(self):
        self.processes: list[subprocess.Popen] = []
        self.running = True

    def start_api_server(self) -> subprocess.Popen:
        """Start the TypeScript REST API server."""
        logger.info("🚀 Starting API server...")
        ts_dir = PROJECT_ROOT / "typescript"

        # Check if node_modules exists
        if not (ts_dir / "node_modules").exists():
            logger.info("📦 Installing TypeScript dependencies...")
            subprocess.run(
                ["npm", "install"],
                cwd=str(ts_dir),
                check=True,
                capture_output=True,
            )

        proc = subprocess.Popen(
            ["npx", "tsx", "src/api.ts"],
            cwd=str(ts_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            env={**os.environ, "NODE_ENV": "production"},
        )
        self.processes.append(proc)
        logger.info(f"  ✅ API server started (PID: {proc.pid})")
        return proc

    def start_discord_bot(self) -> subprocess.Popen:
        """Start the Discord bot."""
        logger.info("🤖 Starting Discord bot...")
        ts_dir = PROJECT_ROOT / "typescript"

        proc = subprocess.Popen(
            ["npx", "tsx", "src/discord.ts"],
            cwd=str(ts_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        self.processes.append(proc)
        logger.info(f"  ✅ Discord bot started (PID: {proc.pid})")
        return proc

    def start_price_monitor(self) -> subprocess.Popen | None:
        """Start the C price monitor daemon."""
        logger.info("💰 Starting price monitor...")
        c_dir = PROJECT_ROOT / "c"
        binary = c_dir / "price_monitor"

        if not binary.exists():
            logger.info("  🔨 Building price monitor...")
            result = subprocess.run(
                ["make"],
                cwd=str(c_dir),
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                logger.warning(f"  ⚠️  Failed to build price monitor: {result.stderr}")
                logger.warning("  Continuing without price monitoring. Install libcurl and libjson-c to enable.")
                return None

        proc = subprocess.Popen(
            [str(binary)],
            cwd=str(c_dir),
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        self.processes.append(proc)
        logger.info(f"  ✅ Price monitor started (PID: {proc.pid})")
        return proc

    async def start_scheduler(self):
        """Start the Python task scheduler."""
        logger.info("⏰ Starting scheduler...")
        from python.scheduler import DropBotScheduler

        scheduler = DropBotScheduler()
        scheduler.start()

        # Keep running until interrupted
        try:
            while self.running:
                await asyncio.sleep(1)
        finally:
            scheduler.stop()

    def stop_all(self):
        """Stop all child processes."""
        self.running = False
        logger.info("\n🛑 Shutting down DropBot...")

        for proc in self.processes:
            try:
                proc.terminate()
                proc.wait(timeout=5)
                logger.info(f"  ✅ Stopped PID {proc.pid}")
            except subprocess.TimeoutExpired:
                proc.kill()
                logger.info(f"  ⚠️  Force killed PID {proc.pid}")
            except Exception as e:
                logger.error(f"  ❌ Error stopping PID {proc.pid}: {e}")

        logger.info("👋 DropBot stopped. See you next time!")

    async def run(self, api_only: bool = False, scrape_only: bool = False):
        """Main run loop."""
        banner()

        if scrape_only:
            # Just run a single scrape cycle
            logger.info("🔍 Running single scrape cycle...")
            from python.scraper import run_scraper
            from python.config import config
            candidates = await run_scraper(config)
            logger.info(f"✅ Found {len(candidates)} new candidates")
            return

        # Start the API server first (everything depends on it)
        self.start_api_server()

        # Wait a bit for the API to be ready
        await asyncio.sleep(3)

        if not api_only:
            # Start Discord bot
            try:
                self.start_discord_bot()
            except Exception as e:
                logger.warning(f"  ⚠️  Discord bot failed to start: {e}")

            # Start price monitor
            try:
                self.start_price_monitor()
            except Exception as e:
                logger.warning(f"  ⚠️  Price monitor failed to start: {e}")

            # Start the Python scheduler (blocking)
            await self.start_scheduler()
        else:
            # API-only mode — just wait
            logger.info("🔧 Running in API-only mode. Press Ctrl+C to stop.")
            try:
                while self.running:
                    await asyncio.sleep(1)
            except KeyboardInterrupt:
                pass

        self.stop_all()


def main():
    parser = argparse.ArgumentParser(
        description="DropBot — AI Dropshipping Automation Bot"
    )
    parser.add_argument(
        "--api", action="store_true",
        help="Start only the REST API server"
    )
    parser.add_argument(
        "--scrape", action="store_true",
        help="Run a single scrape cycle and exit"
    )
    args = parser.parse_args()

    bot = DropBot()

    # Handle signals
    def handle_shutdown(signum, frame):
        bot.stop_all()
        sys.exit(0)

    signal.signal(signal.SIGINT, handle_shutdown)
    signal.signal(signal.SIGTERM, handle_shutdown)

    # Run
    asyncio.run(bot.run(api_only=args.api, scrape_only=args.scrape))


if __name__ == "__main__":
    main()
