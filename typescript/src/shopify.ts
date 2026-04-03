/**
 * Shopify integration via GraphQL Admin API.
 * Handles product creation, updates, deletions, and order management.
 */

import { config } from './config.js';

// ─── Types ─────────────────────────────────────────────

interface ProductInput {
  title: string;
  descriptionHtml: string;
  tags: string[];
  images: { src: string }[];
  variants: {
    price: string;
    compareAtPrice?: string;
    sku?: string;
    inventoryManagement?: string;
  }[];
  seoTitle?: string;
  seoDescription?: string;
}

interface ShopifyProduct {
  id: string;
  title: string;
  status: string;
  variants: {
    edges: {
      node: {
        id: string;
        price: string;
      };
    }[];
  };
}

interface ShopifyOrder {
  id: string;
  name: string;
  totalPriceSet: { shopMoney: { amount: string } };
  customer: { email: string; firstName: string; lastName: string };
  lineItems: {
    edges: {
      node: {
        product: { id: string };
        variant: { id: string };
        quantity: number;
      };
    }[];
  };
  shippingAddress: { formatted: string[] } | null;
  createdAt: string;
  fulfillmentStatus: string;
}

// ─── GraphQL Client ────────────────────────────────────

async function shopifyGraphQL<T = any>(
  query: string, 
  variables?: Record<string, any>,
  creds?: { store_domain: string, access_token: string }
): Promise<T> {
  const domain = creds?.store_domain || config.shopify.storeDomain;
  const token = creds?.access_token || config.shopify.accessToken;
  
  const url = `https://${domain}/admin/api/${config.shopify.apiVersion}/graphql.json`;
  const headers = {
    "X-Shopify-Access-Token": token,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify API error (${response.status}): ${text}`);
  }

  const json = await response.json();

  if (json.errors) {
    throw new Error(`Shopify GraphQL errors: ${JSON.stringify(json.errors)}`);
  }

  return json.data;
}

// ─── Product Operations ────────────────────────────────

export async function createProduct(
  input: ProductInput,
  creds?: { store_domain: string, access_token: string }
): Promise<{ productId: string; variantId: string }> {
  const mutation = `
    mutation productCreate($input: ProductInput!) {
      productCreate(input: $input) {
        product {
          id
          title
          variants(first: 1) {
            edges {
              node {
                id
                price
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, {
    input: {
      title: input.title,
      descriptionHtml: input.descriptionHtml,
      tags: input.tags,
      images: input.images.map(img => ({ src: img.src })),
      variants: input.variants.map(v => ({
        price: v.price,
        compareAtPrice: v.compareAtPrice,
        sku: v.sku,
      })),
      seo: {
        title: input.seoTitle,
        description: input.seoDescription,
      },
    },
  }, creds);

  const result = data.productCreate;
  if (result.userErrors?.length > 0) {
    throw new Error(`Product create errors: ${JSON.stringify(result.userErrors)}`);
  }

  const product = result.product;
  const variantId = product.variants.edges[0]?.node.id || '';

  console.log(`✅ Created Shopify product: ${product.title} (${product.id})`);
  return { productId: product.id, variantId };
}

export async function updateProductPrice(
  variantId: string,
  newPrice: string,
  creds?: { store_domain: string, access_token: string }
): Promise<void> {
  const mutation = `
    mutation productVariantUpdate($input: ProductVariantInput!) {
      productVariantUpdate(input: $input) {
        productVariant {
          id
          price
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, {
    input: {
      id: variantId,
      price: newPrice,
    },
  }, creds);

  const result = data.productVariantUpdate;
  if (result.userErrors?.length > 0) {
    throw new Error(`Price update errors: ${JSON.stringify(result.userErrors)}`);
  }

  console.log(`✅ Updated price for variant ${variantId} to $${newPrice}`);
}

export async function getProducts(
  first: number = 50,
  creds?: { store_domain: string, access_token: string }
): Promise<ShopifyProduct[]> {
  const query = `
    query getProducts($first: Int!) {
      products(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            status
            variants(first: 1) {
              edges {
                node {
                  id
                  price
                }
              }
            }
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { first }, creds);
  return data.products.edges.map((edge: any) => edge.node);
}

export async function deleteProduct(
  productId: string,
  creds?: { store_domain: string, access_token: string }
): Promise<void> {
  const mutation = `
    mutation productDelete($input: ProductDeleteInput!) {
      productDelete(input: $input) {
        deletedProductId
        userErrors {
          field
          message
        }
      }
    }
  `;

  await shopifyGraphQL(mutation, {
    input: { id: productId },
  }, creds);

  console.log(`🗑️ Deleted Shopify product: ${productId}`);
}

// ─── Order Operations ──────────────────────────────────

export async function getRecentOrders(
  first: number = 20,
  creds?: { store_domain: string, access_token: string }
): Promise<ShopifyOrder[]> {
  const query = `
    query getOrders($first: Int!) {
      orders(first: $first, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            totalPriceSet { shopMoney { amount } }
            customer { email firstName lastName }
            lineItems(first: 5) {
              edges {
                node {
                  product { id }
                  variant { id }
                  quantity
                }
              }
            }
            shippingAddress { formatted }
            createdAt
            fulfillmentStatus
          }
        }
      }
    }
  `;

  const data = await shopifyGraphQL(query, { first }, creds);
  return data.orders.edges.map((edge: any) => edge.node);
}

export async function addFulfillmentTracking(
  orderId: string,
  trackingNumber: string,
  trackingUrl: string = '',
  trackingCompany: string = '',
  creds?: { store_domain: string, access_token: string }
): Promise<void> {
  // First, get the fulfillment order
  const fulfillmentQuery = `
    query getFulfillmentOrder($orderId: ID!) {
      order(id: $orderId) {
        fulfillmentOrders(first: 1) {
          edges {
            node {
              id
              status
            }
          }
        }
      }
    }
  `;

  const foData = await shopifyGraphQL(fulfillmentQuery, { orderId }, creds);
  const fulfillmentOrderId = foData.order?.fulfillmentOrders?.edges?.[0]?.node?.id;

  if (!fulfillmentOrderId) {
    throw new Error(`No fulfillment order found for order ${orderId}`);
  }

  const mutation = `
    mutation fulfillmentCreateV2($fulfillment: FulfillmentV2Input!) {
      fulfillmentCreateV2(fulfillment: $fulfillment) {
        fulfillment {
          id
          status
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const data = await shopifyGraphQL(mutation, {
    fulfillment: {
      lineItemsByFulfillmentOrder: [
        { fulfillmentOrderId },
      ],
      trackingInfo: {
        number: trackingNumber,
        url: trackingUrl,
        company: trackingCompany,
      },
      notifyCustomer: true,
    },
  }, creds);

  const result = data.fulfillmentCreateV2;
  if (result.userErrors?.length > 0) {
    throw new Error(`Fulfillment errors: ${JSON.stringify(result.userErrors)}`);
  }

  console.log(`📬 Added tracking ${trackingNumber} to order ${orderId}`);
}

// ─── Stats ─────────────────────────────────────────────

export async function getShopStats(creds?: { store_domain: string, access_token: string }): Promise<{
  shopName: string;
  currencyCode: string;
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
}> {
  const query = `
    query shopStats {
      shop {
        name
        currencyCode
      }
      productsCount { count }
      ordersCount { count }
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            totalPriceSet { shopMoney { amount } }
          }
        }
      }
    }
  `;

  try {
    const data = await shopifyGraphQL(query, {}, creds);
    const revenue = data.orders?.edges?.reduce((acc: number, edge: any) => {
      return acc + parseFloat(edge.node.totalPriceSet?.shopMoney?.amount || '0');
    }, 0) || 0;

    return {
      shopName: data.shop?.name || 'My Store',
      currencyCode: data.shop?.currencyCode || 'USD',
      totalProducts: data.productsCount?.count || 0,
      totalOrders: data.ordersCount?.count || 0,
      totalRevenue: revenue,
    };
  } catch (error) {
    console.error('Error fetching shop stats:', error);
    return { 
      shopName: 'Unknown', 
      currencyCode: 'USD', 
      totalProducts: 0, 
      totalOrders: 0, 
      totalRevenue: 0 
    };
  }
}

/**
 * Get revenue grouped by day for the last 7 days.
 */
export async function getDailyRevenueStats(creds?: { store_domain: string, access_token: string }): Promise<{ name: string, revenue: number, profit: number, orders: number }[]> {
  const query = `
    query dailyStats {
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            totalPriceSet { shopMoney { amount } }
            createdAt
          }
        }
      }
    }
  `;

  try {
    const data = await shopifyGraphQL(query, {}, creds);
    const dayMap: Record<string, { revenue: number, orders: number }> = {};
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    data.orders.edges.forEach((edge: any) => {
      const date = new Date(edge.node.createdAt);
      const dayName = days[date.getDay()];
      const amount = parseFloat(edge.node.totalPriceSet?.shopMoney?.amount || '0');
      
      if (!dayMap[dayName]) dayMap[dayName] = { revenue: 0, orders: 0 };
      dayMap[dayName].revenue += amount;
      dayMap[dayName].orders += 1;
    });

    // Return in order of the week starting from current day backwards
    return days.map(name => ({
      name,
      revenue: dayMap[name]?.revenue || 0,
      profit: (dayMap[name]?.revenue || 0) * 0.3, // 30% estimated profit
      orders: dayMap[name]?.orders || 0
    }));
  } catch {
    return [];
  }
}
