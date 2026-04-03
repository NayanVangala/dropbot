/**
 * TypeScript environment config loader with validation.
 */

import { config as dotenvConfig } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '../../.env') });

function env(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    console.error(`❌ Missing required environment variable: ${key}`);
    process.exit(1);
  }
  return value;
}

export const config = {
  shopify: {
    storeDomain: env('SHOPIFY_STORE_DOMAIN'),
    accessToken: env('SHOPIFY_ACCESS_TOKEN'),
    apiVersion: env('SHOPIFY_API_VERSION', '2025-01'),
    get graphqlUrl() {
      return `https://${this.storeDomain}/admin/api/${this.apiVersion}/graphql.json`;
    },
    get headers() {
      return {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json',
      };
    },
  },

  discord: {
    botToken: env('DISCORD_BOT_TOKEN'),
    clientId: env('DISCORD_CLIENT_ID'),
    guildId: env('DISCORD_GUILD_ID'),
    channelId: env('DISCORD_CHANNEL_ID'),
  },

  api: {
    port: parseInt(env('API_PORT', '3001')),
  },

  dashboard: {
    port: parseInt(env('DASHBOARD_PORT', '5173')),
  },

  picoclaw: {
    enabled: env('PICOCLAW_ENABLED', 'true') === 'true',
    configPath: env('PICOCLAW_CONFIG_PATH', '~/.picoclaw/config.json'),
  },

  gemini: {
    apiKey: env('GEMINI_API_KEY'),
  },
} as const;

export type Config = typeof config;
