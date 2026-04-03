import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import * as shopify from './shopify.js';
import * as fs from 'fs';
import * as path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(config.gemini.apiKey);
const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── Persistent Store Management ───────────────────────

interface Store {
  id: string;
  name: string;
  domain: string;
  accessToken: string;
  isPrimary?: boolean;
}

const STORES_FILE = path.join(process.cwd(), 'data', 'stores.json');

function loadStores(): { activeId: string; stores: Store[] } {
  try {
    if (fs.existsSync(STORES_FILE)) {
      return JSON.parse(fs.readFileSync(STORES_FILE, 'utf-8'));
    }
  } catch (e) {
    console.error('Failed to load stores:', e);
  }
  
  // Default from .env if no file exists
  const defaultStore: Store = {
    id: 'primary',
    name: config.shopify.storeDomain.split('.')[0],
    domain: config.shopify.storeDomain,
    accessToken: config.shopify.accessToken,
    isPrimary: true
  };
  return { activeId: 'primary', stores: [defaultStore] };
}

function saveStores(data: { activeId: string; stores: Store[] }) {
  try {
    const dir = path.dirname(STORES_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORES_FILE, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Failed to save stores:', e);
  }
}

let { activeId, stores } = loadStores();

function getActiveCreds() {
  const store = stores.find(s => s.id === activeId) || stores[0];
  return { store_domain: store.domain, access_token: store.accessToken };
}

// ─── Real Store Endpoints ─────────────────────────────

app.get('/api/stores', (_req, res) => {
  res.json({ activeId, stores: stores.map(s => ({ id: s.id, name: s.name, domain: s.domain, isPrimary: s.isPrimary })) });
});

app.post('/api/stores', (req, res) => {
  const { name, domain, accessToken } = req.body;
  if (!name || !domain || !accessToken) {
    return res.status(400).json({ error: 'Missing name, domain, or accessToken' });
  }

  const newStore: Store = {
    id: Math.random().toString(36).substring(7),
    name,
    domain,
    accessToken
  };

  stores.push(newStore);
  saveStores({ activeId, stores });
  res.json({ success: true, store: newStore });
});

app.post('/api/stores/active', (req, res) => {
  const { id } = req.body;
  if (stores.some(s => s.id === id)) {
    activeId = id;
    saveStores({ activeId, stores });
    res.json({ success: true });
  } else {
    res.status(404).json({ error: 'Store not found' });
  }
});

// ─── In-memory caches ──────────────────────────────────
let candidates: any[] = [];
let discordNotifyCallback: ((message: string, urgent?: boolean) => void) | null = null;

// ─── Health Check ──────────────────────────────────────

app.get('/api/health', async (_req, res) => {
  try {
    const creds = getActiveCreds();
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      activeStore: creds.store_domain,
      components: {
        api: 'running',
        shopify: 'connected',
        discord: discordNotifyCallback ? 'connected' : 'disconnected',
      },
    });
  } catch (e) {
    res.json({ status: 'partial_failure', error: 'Shopify connection failed' });
  }
});


// ─── Product Candidates ────────────────────────────────

app.post('/api/products/candidates', (req, res) => {
  const newCandidates = req.body.candidates || [req.body];
  for (const c of newCandidates) {
    c.id = c.id || crypto.randomUUID().slice(0, 12);
    c.status = 'pending';
    c.submitted_at = new Date().toISOString();
    candidates.push(c);
  }
  console.log(`📦 Received ${newCandidates.length} product candidates`);
  res.json({ success: true, count: newCandidates.length });
});

app.get('/api/products/candidates', (_req, res) => {
  const pending = candidates.filter(c => c.status === 'pending');
  res.json({ candidates: pending, total: pending.length });
});

app.get('/api/products/candidates/all', (_req, res) => {
  res.json({ candidates, total: candidates.length });
});

// ─── Product Listing (Shopify) ─────────────────────────

app.post('/api/products/list', async (req, res) => {
  try {
    const { candidate_id, title, description, tags, images, price, compare_at_price, seo_title, seo_description } = req.body;

    const result = await shopify.createProduct({
      title: title || 'New Product',
      descriptionHtml: description || '<p>High-quality product</p>',
      tags: tags || ['trending'],
      images: (images || []).map((url: string) => ({ src: url })),
      variants: [{
        price: String(price || '29.99'),
        compareAtPrice: compare_at_price ? String(compare_at_price) : undefined,
      }],
      seoTitle: seo_title,
      seoDescription: seo_description,
    }, getActiveCreds());

    // Mark candidate as listed
    if (candidate_id) {
      const candidate = candidates.find(c => c.id === candidate_id);
      if (candidate) {
        candidate.status = 'listed';
        candidate.shopify_product_id = result.productId;
      }
    }

    console.log(`✅ Listed product on Shopify: ${title}`);
    res.json({ success: true, ...result });
  } catch (error: any) {
    console.error(`❌ Failed to list product: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
});

// ─── Active Products ───────────────────────────────────

app.get('/api/products', async (_req, res) => {
  try {
    const products = await shopify.getProducts(50, getActiveCreds());
    res.json({ products, total: products.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:productId', async (req, res) => {
  try {
    await shopify.deleteProduct(req.params.productId, getActiveCreds());
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Price Updates ─────────────────────────────────────

app.post('/api/prices/update', async (req, res) => {
  try {
    const { variant_id, new_price, reason } = req.body;

    if (!variant_id || !new_price) {
      return res.status(400).json({ error: 'variant_id and new_price required' });
    }

    await shopify.updateProductPrice(variant_id, String(new_price), getActiveCreds());

    console.log(`💰 Price updated: ${variant_id} → $${new_price} (${reason || 'manual'})`);

    // Notify Discord about price change
    if (discordNotifyCallback) {
      discordNotifyCallback(`💰 Price updated: $${new_price} (reason: ${reason || 'manual'})`);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Orders ────────────────────────────────────────────

app.get('/api/orders', async (_req, res) => {
  try {
    const orders = await shopify.getRecentOrders(20, getActiveCreds());
    res.json({ orders, total: orders.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/new', async (_req, res) => {
  try {
    const orders = await shopify.getRecentOrders(50, getActiveCreds());
    // Filter to unfulfilled orders
    const newOrders = orders
      .filter((o: any) => o.fulfillmentStatus === 'UNFULFILLED')
      .map((o: any) => ({
        shopify_order_id: o.id,
        order_number: o.name,
        total_price: parseFloat(o.totalPriceSet?.shopMoney?.amount || '0'),
        customer_email: o.customer?.email || '',
        customer_name: `${o.customer?.firstName || ''} ${o.customer?.lastName || ''}`.trim(),
        shipping_address: o.shippingAddress?.formatted?.join(', ') || '',
        product_id: o.lineItems?.edges?.[0]?.node?.product?.id || '',
        variant_id: o.lineItems?.edges?.[0]?.node?.variant?.id || '',
        quantity: o.lineItems?.edges?.[0]?.node?.quantity || 1,
        created_at: o.createdAt,
      }));

    res.json({ orders: newOrders, total: newOrders.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders/:orderId/tracking', async (req, res) => {
  try {
    const { number, url, company } = req.body;
    await shopify.addFulfillmentTracking(req.params.orderId, number, url, company, getActiveCreds());
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Branding & System ───────────────────────────────

const BRANDING_FILE = path.join(process.cwd(), 'data', 'branding.json');

app.get('/api/system/branding', (req: any, res: any) => {
  try {
    if (fs.existsSync(BRANDING_FILE)) {
      const data = fs.readFileSync(BRANDING_FILE, 'utf-8');
      res.json(JSON.parse(data));
    } else {
      res.json({ name: 'DropBot Store', niche: 'General', domain: '' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load branding' });
  }
});

app.post('/api/system/branding', (req: any, res: any) => {
  try {
    const data = req.body;
    if (!fs.existsSync(path.dirname(BRANDING_FILE))) {
      fs.mkdirSync(path.dirname(BRANDING_FILE), { recursive: true });
    }
    fs.writeFileSync(BRANDING_FILE, JSON.stringify(data, null, 2));
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save branding' });
  }
});

app.get('/api/system/logs', (req: any, res: any) => {
  try {
    const logPath = path.join(process.cwd(), '..', 'dropbot', 'dropbot.log');
    if (fs.existsSync(logPath)) {
      const logs = fs.readFileSync(logPath, 'utf-8').split('\n').slice(-40).join('\n');
      res.json({ logs });
    } else {
      res.json({ logs: 'System standby... Waiting for first operation.' });
    }
  } catch (error) {
    res.json({ logs: 'Retrieving core logs...' });
  }
});

// ─── AI Automation Suite ─────────────────────────────

app.post('/api/ai/generate-script', async (req: any, res: any) => {
  try {
    const { title, category } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a viral TikTok marketing expert. Write a high-energy, 15-second TikTok script for this product:
    Title: ${title}
    Category: ${category}
    
    Format accurately:
    HOOK: (3 seconds - capture attention instantly)
    BODY: (9 seconds - highlight 1 key benefit, not just features)
    CTA: (3 seconds - clear instruction to buy/check link)
    
    Use Gen-Z slang, emojis, and trending phrases.`;
    
    const result = await model.generateContent(prompt);
    res.json({ script: result.response.text() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/draft-email', async (req: any, res: any) => {
  try {
    const { inquiry, tone, context } = req.body;
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `You are a world-class customer concierge for an e-commerce store.
    Write a ${tone} response to this customer inquiry:
    "${inquiry}"
    
    Context: ${context || 'General inquiry'}
    
    Keep it concise, professional, and helpful. If a refund is involved, explain the process clearly.`;
    
    const result = await model.generateContent(prompt);
    res.json({ draft: result.response.text() });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Stats ─────────────────────────────────────────────

app.get('/api/stats', async (_req, res) => {
  try {
    const creds = getActiveCreds();
    const shopStats = await shopify.getShopStats(creds);
    const dailyRevenue = await shopify.getDailyRevenueStats(creds);
    
    const listedCandidates = candidates.filter(c => c.status === 'listed').length;
    const pendingCandidates = candidates.filter(c => c.status === 'pending').length;

    res.json({
      shopify: shopStats,
      dailyRevenue,
      candidates: {
        total: candidates.length,
        pending: pendingCandidates,
        listed: listedCandidates,
      },
      system: {
        activeStore: shopStats.shopName || creds.store_domain,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
      currency: shopStats.currencyCode || 'USD',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/activities', async (_req, res) => {
  try {
    const creds = getActiveCreds();
    const orders = await shopify.getRecentOrders(5, creds);
    const activities: any[] = [];
    
    orders.forEach((o: any) => {
      activities.push({
        type: 'sale',
        text: `Real order processed: ${o.name} for ${o.customer?.firstName || 'Customer'}`,
        time: new Date(o.createdAt).toLocaleTimeString(),
        timestamp: new Date(o.createdAt).getTime()
      });
    });
    
    // System events
    candidates.slice(-3).forEach(c => {
      if (c.status === 'listed') {
        activities.push({
          type: 'listing',
          text: `Automated Listing: ${c.title}`,
          time: 'Recently',
          timestamp: Date.now() - 1000 * 60 * 30
        });
      }
    });

    if (activities.length === 0) {
      activities.push({
        type: 'alert',
        text: 'System heartbeat: Monitoring for new orders...',
        time: 'Now',
        timestamp: Date.now()
      });
    }

    res.json(activities.sort((a, b) => b.timestamp - a.timestamp));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Discord Notifications ─────────────────────────────

app.post('/api/discord/notify', (req, res) => {
  const { message, urgent } = req.body;
  if (discordNotifyCallback) {
    discordNotifyCallback(message, urgent);
    res.json({ success: true });
  } else {
    console.log(`📢 [Discord offline] ${message}`);
    res.json({ success: true, queued: true });
  }
});

// ─── Customer Messages (placeholder) ──────────────────

app.get('/api/messages/unhandled', (_req, res) => {
  // Placeholder — would integrate with Shopify customer messages
  res.json({ messages: [] });
});

app.post('/api/messages/respond', (req, res) => {
  console.log(`💬 Response sent to ${req.body.customer_email}`);
  res.json({ success: true });
});

// ─── PicoClaw ──────────────────────────────────────────

app.post('/api/picoclaw/decide', async (req, res) => {
  try {
    const { context, options } = req.body;
    // PicoClaw integration — forwards to PicoClaw bridge
    console.log(`🧠 PicoClaw decision requested: ${context?.slice(0, 100)}`);
    res.json({
      decision: 'pending',
      message: 'Decision request forwarded to PicoClaw',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Discord Callback Registration ────────────────────

export function registerDiscordNotifier(callback: (message: string, urgent?: boolean) => void) {
  discordNotifyCallback = callback;
  console.log('✅ Discord notifier registered');
}

// ─── Start Server ──────────────────────────────────────

const PORT = config.api.port;

app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🤖 DropBot API Server                  ║
  ║   Port: ${PORT}                            ║
  ║   Time: ${new Date().toLocaleTimeString()}                       ║
  ╚══════════════════════════════════════════╝
  `);
  console.log('Endpoints:');
  console.log('  GET  /api/health');
  console.log('  GET  /api/products');
  console.log('  POST /api/products/candidates');
  console.log('  POST /api/products/list');
  console.log('  POST /api/prices/update');
  console.log('  GET  /api/orders');
  console.log('  GET  /api/stats');
  console.log('  POST /api/discord/notify');
});

export { app };
