# 🛠️ DropBot: Next Steps & Connection Guide

Now that your Shopify store is linked, we need to bridge the gap with your supplier (CJ Dropshipping) and your communication hub (Discord).

---

## 1. CJ Dropshipping Setup (The Supplier)
The bot uses CJ Dropshipping to source products and fulfill orders.
1.  Log in at [cjdropshipping.com](https://cjdropshipping.com).
2.  Go to **My CJ** (Top Right) → **App / API** → **API**.
3.  Click **API Key** and copy your **Access Token**.
4.  Paste it into `.env`:
    ```bash
    CJ_ACCESS_TOKEN=your_token_here
    ```

---

## 2. Discord "Developer Mode" (The Comm Center)
To get the bot to report viral products to you, we need specific IDs.
1.  Open Discord → **User Settings** → **Advanced**.
2.  Toggle **Developer Mode** on.
3.  **Get Server ID:** Right-click your server's name in the left list → **Copy Server ID**.
4.  **Get Channel ID:** Right-click the channel where you want reports → **Copy Channel ID**.
5.  Paste them into `.env`:
    ```bash
    DISCORD_GUILD_ID=your_copied_server_id
    DISCORD_CHANNEL_ID=your_copied_channel_id
    ```

---

## 3. The AI Brain (Google Gemini - FREE)
The bot needs an AI "Brain" to write descriptions and analyze products. Gemini has a generous free tier.
1.  Go to [aistudio.google.com](https://aistudio.google.com/app/apikey).
2.  Create an **API Key**.
3.  Paste it into `.env`:
    ```bash
    LLM_PROVIDER=gemini
    GEMINI_API_KEY=AIzaSy...
    ```

---

## 🚀 Launching the Bot
Once your `.env` is filled, run these commands in separate terminal windows:

### Window 1: The Engine (API & Discord)
```bash
cd typescript
npm install
npm run dev
```

### Window 2: The Dashboard (Visuals)
```bash
cd typescript/dashboard
npm install
npm run dev
```

### Window 3: The Scraper (Automation)
```bash
python3 -m python.scheduler
```

---

> [!TIP]
> **PRO-TIP:** If you prefer local offline AI, we can configure the bot to use **Ollama**. Just let me know!
