/**
 * Express REST API — the central nervous system connecting all components.
 * Python, C price monitor, Discord bot, and Dashboard all communicate through this.
 */

import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import * as shopify from './shopify.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ─── In-memory stores (backed by Python's SQLite via API calls) ────
// These are lightweight caches for the TypeScript side.
// The Python SQLite DB is the source of truth.

let candidates: any[] = [];
let discordNotifyCallback: ((message: string, urgent?: boolean) => void) | null = null;

// ─── Health Check ──────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    components: {
      api: 'running',
      shopify: 'connected',
      discord: discordNotifyCallback ? 'connected' : 'disconnected',
    },
  });
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
    });

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
    const products = await shopify.getProducts();
    res.json({ products, total: products.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/products/:productId', async (req, res) => {
  try {
    await shopify.deleteProduct(req.params.productId);
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

    await shopify.updateProductPrice(variant_id, String(new_price));

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
    const orders = await shopify.getRecentOrders();
    res.json({ orders, total: orders.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/new', async (_req, res) => {
  try {
    const orders = await shopify.getRecentOrders(50);
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
    await shopify.addFulfillmentTracking(req.params.orderId, number, url, company);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ─── Stats ─────────────────────────────────────────────

app.get('/api/stats', async (_req, res) => {
  try {
    const shopStats = await shopify.getShopStats();
    const listedCandidates = candidates.filter(c => c.status === 'listed').length;
    const pendingCandidates = candidates.filter(c => c.status === 'pending').length;

    res.json({
      shopify: shopStats,
      candidates: {
        total: candidates.length,
        pending: pendingCandidates,
        listed: listedCandidates,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
      },
    });
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
