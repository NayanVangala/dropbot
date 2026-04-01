# 🤖 DropBot — AI Dropshipping Automation

A fully autonomous dropshipping system running 24/7 on a **Raspberry Pi 5** with **PicoClaw** as the AI decision-making brain.

## Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Scraping & Data | Python | Product research, order management, customer service |
| API & Shopify | TypeScript + Express | REST API, Shopify GraphQL, Discord bot |
| Dashboard | React + Vite | Live sales dashboard, accessible from phone |
| Price Monitor | C | High-performance 15-min competitor price checks |
| AI Brain | PicoClaw | Product decisions, edge case handling |

---

## Quick Start

### 1. Configure environment
```bash
cp .env.example .env
# Fill in your Shopify, Discord, and LLM keys
```

### 2. Install dependencies
```bash
# Python
pip3 install -r requirements.txt
playwright install chromium   # for JS-rendered scraping

# TypeScript
cd typescript && npm install
```

### 3. Build the C price monitor
```bash
# macOS: brew install curl json-c
# Pi:    sudo apt install libcurl4-openssl-dev libjson-c-dev
cd c && make
```

### 4. Run
```bash
# Start everything (API + Discord + scheduler + price monitor)
python main.py

# Start only the API server
python main.py --api

# Run a single scrape cycle
python main.py --scrape

# Dashboard only (dev mode)
cd typescript/dashboard && npx vite --host
```

---

## Architecture

```
Discord (phone) ←→ Discord Bot (TypeScript)
                        ↕
                   REST API :3001 (TypeScript/Express)
                  /    |    |    \
          Shopify  Python  C       Dashboard
          GraphQL  Sched.  Price   :5173 (React)
                   |       Monitor
                   ↓
             SQLite DB
             (data/dropbot.db)
```

## Key Flows

### Product Research → Listing
1. Scraper finds trending products (TikTok, Amazon, AliExpress)
2. Filters by margin (≥30%), shipping (≤15d), reviews (≥4★)
3. Sends candidates to PicoClaw via Discord
4. PicoClaw approves → auto-listed on Shopify with AI-generated copy

### Order Fulfillment
1. Shopify webhook → orders detected via API polling
2. Python auto-places order with supplier
3. Tracking number pushed back to Shopify + customer email

### Price Monitoring
1. C daemon checks competitor prices every 15 min
2. POSTs to REST API when threshold hit
3. Python adjusts Shopify price, maintains minimum margin

---

## Discord Commands

| Command | Description |
|---------|-------------|
| `/status` | System health + stats |
| `/sales [today\|week\|month]` | Revenue report |
| `/trending [category] [max_price]` | Find products |
| `/candidates` | View pending approvals |
| `/list <id>` | Approve and list a product |
| `/price <variant_id> <price>` | Manual price override |
| `/pause` / `/resume` | Pause automation |

---

## File Structure

```
dropbot/
├── main.py                  # Entry point — starts all services
├── requirements.txt
├── .env.example
├── python/
│   ├── config.py            # Typed config loader
│   ├── models.py            # Pydantic data models
│   ├── db.py                # SQLite database layer
│   ├── scraper.py           # Multi-source product scraper
│   ├── ai_utils.py          # LLM utilities (copy, CS, eval)
│   ├── orders.py            # Order fulfillment automation
│   ├── customer.py          # AI customer service
│   └── scheduler.py         # APScheduler task orchestrator
├── typescript/
│   ├── src/
│   │   ├── config.ts        # TS config loader
│   │   ├── api.ts           # REST API (Express)
│   │   ├── shopify.ts       # Shopify GraphQL integration
│   │   ├── discord.ts       # Discord bot (discord.js)
│   │   └── picoclaw.ts      # PicoClaw AI bridge
│   └── dashboard/           # React + Vite dashboard
│       └── src/
│           ├── App.tsx
│           ├── index.css    # Full design system
│           ├── hooks/useApi.ts
│           └── pages/
│               ├── Dashboard.tsx
│               ├── Products.tsx
│               ├── Orders.tsx
│               └── Trending.tsx
└── c/
    ├── price_monitor.c      # C daemon
    └── Makefile
```

---

## Raspberry Pi Deployment

```bash
# On the Pi — clone the repo
git clone <your-repo> ~/dropbot
cd ~/dropbot

# Install system deps
sudo apt install libcurl4-openssl-dev libjson-c-dev nodejs npm python3-pip

# Install project deps
pip3 install -r requirements.txt
cd typescript && npm install
cd c && make

# Run as a systemd service (auto-start on boot)
sudo cp deploy/dropbot.service /etc/systemd/system/
sudo systemctl enable dropbot
sudo systemctl start dropbot
```

---

## PicoClaw Setup

1. Install PicoClaw on the Pi: `curl -sSL https://install.picoclaw.io | sh`
2. Run `picoclaw onboard` and add your LLM API key
3. Set `PICOCLAW_ENABLED=true` in `.env`
4. PicoClaw will receive product candidates via Discord and respond with decisions

---

## Roadmap

- [ ] CJ Dropshipping API integration (replace scraping)
- [ ] Shopify webhook support (real-time order detection)
- [ ] ngrok auto-tunnel for remote dashboard access
- [ ] Product image AI enhancement
- [ ] Multi-store support
- [ ] Profit analytics charts (real data)
