# 🚀 DropBot: Shopify Launch Guide

Follow these steps to set up your free development store and connect it to your bot.

## Phase 1: Create Your Store ($0)
1.  Go to [Shopify Partners](https://partners.shopify.com/signup).
2.  Login or Create an Account.
3.  Navigate to **Stores** in the left sidebar.
4.  Click **Add Store** → **Create development store**.
5.  Select **Create store to test and build**.
6.  **Store Name:** Give it a unique name (e.g., `nayan-drop-test`).
7.  Click **Create Store**.

---

## Phase 2: Generate API Tokens
Once the store is created, you'll be in the Store Admin dashboard.
1.  Go to **Settings** (bottom left) → **Apps and sales channels**.
2.  Click **Develop apps** (top right).
3.  Click **Create an app**.
4.  **App Name:** `DropBot`.
5.  Under **Configuration**, click **Configure** for **Admin API integration**.
6.  Search for and **Check** these scopes:
    -   `write_products` & `read_products`
    -   `write_orders` & `read_orders`
    -   `write_inventory` & `read_inventory`
    -   `write_shipping` & `read_shipping`
7.  Click **Save** at the top right.
8.  Go to the **API credentials** tab and click **Install app**.
9.  Click **Reveal token once** and copy the string starting with `shpat_...`. 

> [!CAUTION]
> You can only see the **Admin API access token** ONCE. Save it somewhere safe immediately!

---

## Phase 3: Connect the Bot
Open your `.env` file in the root of the project and update these values:

```bash
SHOPIFY_STORE_DOMAIN=your-store-name.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## Next Steps
Once connected, you can use the bot to:
-   **Scrape Trending Products**: Find viral candidates.
-   **AI Upscale**: Enhance supplier images.
-   **Live List**: Push products directly to your Shopify store.
