/**
 * PicoClaw integration bridge.
 * Sends structured prompts to PicoClaw and parses its decisions into actions.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { config } from './config.js';

const execAsync = promisify(exec);
const API_BASE = `http://localhost:${config.api.port}`;

// ─── Types ─────────────────────────────────────────────

interface PicoClawDecision {
  action: 'list' | 'skip' | 'adjust_price' | 'remove' | 'escalate';
  productIds?: string[];
  reasoning: string;
  confidence: number;
  parameters?: Record<string, any>;
}

interface ProductCandidate {
  id: string;
  title: string;
  supplier_price: number;
  suggested_retail_price: number;
  profit_margin: number;
  review_score: number;
  review_count: number;
  trending_score: number;
  category: string;
  source: string;
}

// ─── PicoClaw Bridge ───────────────────────────────────

export class PicoClawBridge {
  private enabled: boolean;

  constructor() {
    this.enabled = config.picoclaw.enabled;
  }

  /**
   * Send product candidates to PicoClaw for evaluation.
   * PicoClaw decides which products to list, skip, or investigate further.
   */
  async evaluateCandidates(candidates: ProductCandidate[]): Promise<PicoClawDecision> {
    if (!this.enabled) {
      console.log('🧠 PicoClaw disabled — auto-approving qualifying candidates');
      return this.fallbackDecision(candidates);
    }

    const prompt = this.formatCandidatePrompt(candidates);

    try {
      const response = await this.queryPicoClaw(prompt);
      return this.parseDecision(response, candidates);
    } catch (error) {
      console.error('PicoClaw query failed, using fallback:', error);
      return this.fallbackDecision(candidates);
    }
  }

  /**
   * Ask PicoClaw to handle an edge case.
   * E.g., out-of-stock product, shipping delay, customer complaint.
   */
  async handleEdgeCase(context: string, options: string[]): Promise<PicoClawDecision> {
    if (!this.enabled) {
      return {
        action: 'escalate',
        reasoning: 'PicoClaw disabled — escalating to human',
        confidence: 0,
      };
    }

    const prompt = `
You are the AI brain of an automated dropshipping store.

SITUATION: ${context}

AVAILABLE ACTIONS:
${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}

Choose the best action and explain your reasoning. Respond in this format:
ACTION: <action number>
REASONING: <your reasoning>
CONFIDENCE: <0.0-1.0>
    `.trim();

    try {
      const response = await this.queryPicoClaw(prompt);
      return this.parseEdgeCaseResponse(response, options);
    } catch (error) {
      return {
        action: 'escalate',
        reasoning: `PicoClaw error: ${error}`,
        confidence: 0,
      };
    }
  }

  /**
   * Send a natural language query to PicoClaw.
   * Used for Discord conversations where users talk to PicoClaw directly.
   */
  async chat(message: string): Promise<string> {
    if (!this.enabled) {
      return "PicoClaw is currently disabled. Enable it in your .env configuration.";
    }

    try {
      return await this.queryPicoClaw(message);
    } catch (error) {
      return `I encountered an error: ${error}. Please check the PicoClaw configuration.`;
    }
  }

  // ─── PicoClaw Communication ──────────────────────────

  private async queryPicoClaw(prompt: string): Promise<string> {
    /**
     * PicoClaw can be queried via:
     * 1. CLI: `picoclaw agent --query "..."`
     * 2. Gateway: via Discord/Telegram integration
     * 3. MCP: via Model Context Protocol
     *
     * We use the CLI approach for simplicity.
     */
    try {
      // Escape the prompt for shell
      const escapedPrompt = prompt.replace(/"/g, '\\"').replace(/\n/g, '\\n');

      const { stdout, stderr } = await execAsync(
        `picoclaw agent --query "${escapedPrompt}" --json 2>/dev/null`,
        { timeout: 30000 }
      );

      if (stderr) {
        console.warn('PicoClaw stderr:', stderr);
      }

      return stdout.trim();
    } catch (error: any) {
      // If picoclaw CLI is not available, try HTTP
      console.warn('PicoClaw CLI not available, trying HTTP fallback...');
      return this.queryPicoClawHTTP(prompt);
    }
  }

  private async queryPicoClawHTTP(prompt: string): Promise<string> {
    /**
     * Fallback: Query PicoClaw via its HTTP API if the CLI isn't available.
     * PicoClaw exposes an HTTP endpoint when running as a gateway.
     */
    try {
      const resp = await fetch('http://localhost:8080/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });

      if (!resp.ok) {
        throw new Error(`PicoClaw HTTP ${resp.status}`);
      }

      const data = await resp.json();
      return data.response || data.message || JSON.stringify(data);
    } catch (error) {
      throw new Error(`PicoClaw unavailable (both CLI and HTTP failed): ${error}`);
    }
  }

  // ─── Prompt Formatting ───────────────────────────────

  private formatCandidatePrompt(candidates: ProductCandidate[]): string {
    const productList = candidates.map((c, i) => 
      `${i + 1}. "${c.title}" — Cost: $${c.supplier_price.toFixed(2)}, ` +
      `Sell: $${c.suggested_retail_price.toFixed(2)}, ` +
      `Margin: ${(c.profit_margin * 100).toFixed(0)}%, ` +
      `Rating: ${c.review_score}★ (${c.review_count} reviews), ` +
      `Trend: ${c.trending_score}/100, ` +
      `Category: ${c.category}, Source: ${c.source}`
    ).join('\n');

    return `
You are the AI decision-maker for an automated dropshipping store on Shopify.

Here are ${candidates.length} new product candidates found by the scraper:

${productList}

Evaluate each product and decide:
- Which ones to LIST (best profit potential + trend momentum)
- Which ones to SKIP (too risky, low margin, or saturated)

Consider:
- Profit margin (minimum 30% after all costs)
- Trending momentum (higher is better)
- Review quality (good ratings = fewer returns)
- Category diversity (don't over-concentrate in one niche)

Respond with:
LIST: <comma-separated product numbers>
SKIP: <comma-separated product numbers>
REASONING: <your analysis>
    `.trim();
  }

  // ─── Response Parsing ────────────────────────────────

  private parseDecision(response: string, candidates: ProductCandidate[]): PicoClawDecision {
    try {
      // Try JSON parse first
      const parsed = JSON.parse(response);
      if (parsed.action) return parsed;
    } catch {
      // Parse natural language response
    }

    const listMatch = response.match(/LIST:\s*([0-9,\s]+)/i);
    const reasonMatch = response.match(/REASONING:\s*(.+)/is);

    const listNumbers = listMatch
      ? listMatch[1].split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n))
      : [];

    const listIds = listNumbers
      .map(n => candidates[n - 1]?.id)
      .filter(Boolean);

    return {
      action: listIds.length > 0 ? 'list' : 'skip',
      productIds: listIds,
      reasoning: reasonMatch?.[1]?.trim() || response.slice(0, 200),
      confidence: listIds.length > 0 ? 0.8 : 0.5,
    };
  }

  private parseEdgeCaseResponse(response: string, options: string[]): PicoClawDecision {
    const actionMatch = response.match(/ACTION:\s*(\d+)/i);
    const reasonMatch = response.match(/REASONING:\s*(.+?)(?:\n|CONFIDENCE)/is);
    const confMatch = response.match(/CONFIDENCE:\s*([\d.]+)/i);

    const actionNum = actionMatch ? parseInt(actionMatch[1]) : 1;
    const action = options[actionNum - 1] || options[0];

    return {
      action: 'escalate',
      reasoning: reasonMatch?.[1]?.trim() || response.slice(0, 200),
      confidence: confMatch ? parseFloat(confMatch[1]) : 0.5,
      parameters: { selected_option: action, option_index: actionNum },
    };
  }

  // ─── Fallback ────────────────────────────────────────

  private fallbackDecision(candidates: ProductCandidate[]): PicoClawDecision {
    // Simple rule-based fallback when PicoClaw is unavailable
    const goodCandidates = candidates.filter(c =>
      c.profit_margin >= 0.30 &&
      c.review_score >= 4.0 &&
      c.trending_score >= 60
    );

    return {
      action: goodCandidates.length > 0 ? 'list' : 'skip',
      productIds: goodCandidates.map(c => c.id),
      reasoning: `Auto-approved ${goodCandidates.length}/${candidates.length} candidates based on margin (≥30%), rating (≥4★), and trend score (≥60).`,
      confidence: 0.6,
    };
  }
}

// Singleton export
export const picoclaw = new PicoClawBridge();
