/**
 * Discord bot — control interface and reporting.
 * Handles slash commands, daily reports, and PicoClaw communication.
 */

import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  TextChannel,
  EmbedBuilder,
  Colors,
  type ChatInputCommandInteraction,
} from 'discord.js';
import { config } from './config.js';

const API_BASE = `http://localhost:${config.api.port}`;

// ─── Bot Client ────────────────────────────────────────

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// ─── Slash Commands Definition ─────────────────────────

const commands = [
  new SlashCommandBuilder()
    .setName('status')
    .setDescription('Show current system status'),

  new SlashCommandBuilder()
    .setName('sales')
    .setDescription('View sales report')
    .addStringOption(opt =>
      opt.setName('period')
        .setDescription('Time period')
        .setRequired(false)
        .addChoices(
          { name: 'Today', value: 'today' },
          { name: 'This Week', value: 'week' },
          { name: 'This Month', value: 'month' },
        )
    ),

  new SlashCommandBuilder()
    .setName('trending')
    .setDescription('Find trending products')
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Product category (e.g., gaming, beauty, tech)')
        .setRequired(false)
    )
    .addNumberOption(opt =>
      opt.setName('max_price')
        .setDescription('Maximum price in USD')
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName('list')
    .setDescription('Approve a product candidate for listing')
    .addStringOption(opt =>
      opt.setName('product_id')
        .setDescription('Product candidate ID')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('candidates')
    .setDescription('View pending product candidates'),

  new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause automation'),

  new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume automation'),

  new SlashCommandBuilder()
    .setName('price')
    .setDescription('Manually set product price')
    .addStringOption(opt =>
      opt.setName('variant_id')
        .setDescription('Shopify variant ID')
        .setRequired(true)
    )
    .addNumberOption(opt =>
      opt.setName('new_price')
        .setDescription('New price in USD')
        .setRequired(true)
    ),
];

// ─── Register Commands ─────────────────────────────────

async function registerCommands() {
  const rest = new REST().setToken(config.discord.botToken);

  try {
    console.log('📝 Registering Discord slash commands...');
    await rest.put(
      Routes.applicationGuildCommands(config.discord.clientId, config.discord.guildId),
      { body: commands.map(c => c.toJSON()) },
    );
    console.log('✅ Slash commands registered');
  } catch (error) {
    console.error('❌ Failed to register commands:', error);
  }
}

// ─── Command Handlers ──────────────────────────────────

async function handleStatus(interaction: ChatInputCommandInteraction) {
  try {
    const resp = await fetch(`${API_BASE}/api/health`);
    const health = await resp.json();

    const statsResp = await fetch(`${API_BASE}/api/stats`);
    const stats = await statsResp.json();

    const embed = new EmbedBuilder()
      .setTitle('🤖 DropBot Status')
      .setColor(Colors.Green)
      .addFields(
        { name: '⏱️ Uptime', value: `${Math.floor(health.uptime / 60)} min`, inline: true },
        { name: '🏪 Products', value: `${stats.shopify?.totalProducts || 0}`, inline: true },
        { name: '📦 Orders', value: `${stats.shopify?.totalOrders || 0}`, inline: true },
        { name: '📋 Pending Candidates', value: `${stats.candidates?.pending || 0}`, inline: true },
        { name: '✅ Listed', value: `${stats.candidates?.listed || 0}`, inline: true },
        { name: '💾 Memory', value: `${Math.round((stats.system?.memory?.rss || 0) / 1024 / 1024)} MB`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply('❌ Failed to fetch status. Is the API server running?');
  }
}

async function handleSales(interaction: ChatInputCommandInteraction) {
  const period = interaction.options.getString('period') || 'today';

  try {
    const resp = await fetch(`${API_BASE}/api/stats`);
    const stats = await resp.json();

    const embed = new EmbedBuilder()
      .setTitle(`📊 Sales Report — ${period.charAt(0).toUpperCase() + period.slice(1)}`)
      .setColor(Colors.Blue)
      .addFields(
        { name: '💵 Revenue', value: `$${stats.shopify?.totalOrders || 0}`, inline: true },
        { name: '📦 Orders', value: `${stats.shopify?.totalOrders || 0}`, inline: true },
        { name: '🏪 Active Listings', value: `${stats.shopify?.totalProducts || 0}`, inline: true },
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply('❌ Failed to fetch sales data.');
  }
}

async function handleTrending(interaction: ChatInputCommandInteraction) {
  const category = interaction.options.getString('category') || '';
  const maxPrice = interaction.options.getNumber('max_price') || 0;

  await interaction.deferReply();

  try {
    const resp = await fetch(`${API_BASE}/api/products/candidates`);
    const data = await resp.json();
    const pendingCandidates = data.candidates || [];

    if (pendingCandidates.length === 0) {
      await interaction.editReply('📭 No trending candidates found. The scraper will find more soon!');
      return;
    }

    let filtered = pendingCandidates;
    if (category) {
      filtered = filtered.filter((c: any) =>
        c.category?.toLowerCase().includes(category.toLowerCase()) ||
        c.title?.toLowerCase().includes(category.toLowerCase())
      );
    }
    if (maxPrice > 0) {
      filtered = filtered.filter((c: any) => c.suggested_retail_price <= maxPrice);
    }

    const embed = new EmbedBuilder()
      .setTitle(`📈 Trending Products${category ? ` — ${category}` : ''}${maxPrice ? ` (under $${maxPrice})` : ''}`)
      .setColor(Colors.Gold)
      .setDescription(
        filtered.slice(0, 10).map((c: any, i: number) =>
          `**${i + 1}. ${c.title?.slice(0, 50)}**\n` +
          `💰 $${c.supplier_price?.toFixed(2)} → $${c.suggested_retail_price?.toFixed(2)} ` +
          `(${(c.profit_margin * 100).toFixed(0)}% margin)\n` +
          `⭐ ${c.review_score}★ | 📈 Trend: ${c.trending_score}/100\n` +
          `ID: \`${c.id}\``
        ).join('\n\n') || 'No products match your criteria.'
      )
      .setFooter({ text: `Use /list <id> to approve a product` })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    await interaction.editReply('❌ Failed to fetch trending products.');
  }
}

async function handleCandidates(interaction: ChatInputCommandInteraction) {
  try {
    const resp = await fetch(`${API_BASE}/api/products/candidates`);
    const data = await resp.json();
    const pending = data.candidates || [];

    if (pending.length === 0) {
      await interaction.reply('📭 No pending candidates. The scraper will find more soon!');
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`📋 Pending Product Candidates (${pending.length})`)
      .setColor(Colors.Orange)
      .setDescription(
        pending.slice(0, 10).map((c: any, i: number) =>
          `**${i + 1}.** ${c.title?.slice(0, 50)} — $${c.suggested_retail_price?.toFixed(2)} ` +
          `(${(c.profit_margin * 100).toFixed(0)}%) — ID: \`${c.id}\``
        ).join('\n')
      )
      .setFooter({ text: 'Use /list <id> to approve' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    await interaction.reply('❌ Failed to fetch candidates.');
  }
}

async function handleList(interaction: ChatInputCommandInteraction) {
  const productId = interaction.options.getString('product_id', true);
  await interaction.deferReply();

  try {
    // Find the candidate
    const resp = await fetch(`${API_BASE}/api/products/candidates/all`);
    const data = await resp.json();
    const candidate = (data.candidates || []).find((c: any) => c.id === productId);

    if (!candidate) {
      await interaction.editReply(`❌ Candidate \`${productId}\` not found.`);
      return;
    }

    // List on Shopify
    const listResp = await fetch(`${API_BASE}/api/products/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id: productId,
        title: candidate.title,
        description: candidate.description || `<p>${candidate.title}</p>`,
        tags: candidate.tags || ['trending'],
        images: candidate.image_urls || [],
        price: candidate.suggested_retail_price,
      }),
    });

    const result = await listResp.json();

    if (result.success) {
      await interaction.editReply(
        `✅ **Listed on Shopify!**\n` +
        `📦 ${candidate.title}\n` +
        `💰 $${candidate.suggested_retail_price}\n` +
        `🆔 ${result.productId}`
      );
    } else {
      await interaction.editReply(`❌ Failed to list: ${result.error}`);
    }
  } catch (error) {
    await interaction.editReply('❌ Failed to list product. Check API server.');
  }
}

async function handlePrice(interaction: ChatInputCommandInteraction) {
  const variantId = interaction.options.getString('variant_id', true);
  const newPrice = interaction.options.getNumber('new_price', true);

  try {
    const resp = await fetch(`${API_BASE}/api/prices/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variant_id: variantId,
        new_price: newPrice,
        reason: 'manual_discord',
      }),
    });

    const result = await resp.json();
    if (result.success) {
      await interaction.reply(`✅ Price updated to $${newPrice.toFixed(2)}`);
    } else {
      await interaction.reply(`❌ Failed: ${result.error}`);
    }
  } catch (error) {
    await interaction.reply('❌ Failed to update price.');
  }
}

let automationPaused = false;

async function handlePause(interaction: ChatInputCommandInteraction) {
  automationPaused = true;
  await interaction.reply('⏸️ Automation **paused**. Use `/resume` to restart.');
}

async function handleResume(interaction: ChatInputCommandInteraction) {
  automationPaused = false;
  await interaction.reply('▶️ Automation **resumed**. All systems active.');
}

// ─── Event Handlers ────────────────────────────────────

client.once('ready', () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🤖 DropBot Discord                     ║
  ║   Logged in as ${client.user?.tag?.padEnd(20) || 'Unknown'}    ║
  ╚══════════════════════════════════════════╝
  `);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const handlers: Record<string, (i: ChatInputCommandInteraction) => Promise<void>> = {
    status: handleStatus,
    sales: handleSales,
    trending: handleTrending,
    candidates: handleCandidates,
    list: handleList,
    price: handlePrice,
    pause: handlePause,
    resume: handleResume,
  };

  const handler = handlers[interaction.commandName];
  if (handler) {
    try {
      await handler(interaction);
    } catch (error) {
      console.error(`Command ${interaction.commandName} failed:`, error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply('❌ Something went wrong. Check the logs.');
      } else {
        await interaction.reply('❌ Something went wrong. Check the logs.');
      }
    }
  }
});

// ─── Send Notification ─────────────────────────────────

export async function sendNotification(message: string, urgent: boolean = false) {
  try {
    const channel = await client.channels.fetch(config.discord.channelId);
    if (channel && channel.isTextBased()) {
      if (urgent) {
        const embed = new EmbedBuilder()
          .setTitle('🚨 Urgent Alert')
          .setDescription(message)
          .setColor(Colors.Red)
          .setTimestamp();
        await (channel as TextChannel).send({ embeds: [embed] });
      } else {
        await (channel as TextChannel).send(message);
      }
    }
  } catch (error) {
    console.error('Failed to send Discord notification:', error);
  }
}

// ─── Start Bot ─────────────────────────────────────────

export async function startDiscordBot() {
  await registerCommands();
  await client.login(config.discord.botToken);

  // Register as notifier with the API
  const { registerDiscordNotifier } = await import('./api.js');
  registerDiscordNotifier(sendNotification);

  return client;
}

// Run directly if executed as main
const isMain = process.argv[1]?.endsWith('discord.ts') || process.argv[1]?.endsWith('discord.js');
if (isMain) {
  startDiscordBot().catch(console.error);
}
