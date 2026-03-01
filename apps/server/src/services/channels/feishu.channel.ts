import * as crypto from 'crypto';

import { Service } from 'typedi';

import { logger } from '../../utils/logger.js';

import type { PushChannel, PushChannelOptions } from './push-channel.interface.js';

export interface FeishuChannelConfig {
  webhookUrl: string; // Feishu webhook URL
  secret?: string; // Signing secret (optional)
}

/**
 * Feishu Channel Implementation
 * Sends push notifications to Feishu custom bot webhook
 */
export class FeishuChannel implements PushChannel {
  constructor(private config: FeishuChannelConfig) {}

  /**
   * Generate signature for Feishu webhook
   * @param timestamp - Unix timestamp in seconds
   * @param secret - Signing secret
   * @returns Base64 encoded signature
   */
  private generateSignature(timestamp: number, secret: string): string {
    const stringToSign = `${timestamp}\n${secret}`;
    const hmac = crypto.createHmac('sha256', stringToSign);
    const sign = hmac.update('').digest('base64');
    return sign;
  }

  /**
   * Strip HTML tags from text for plain text display
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .replace(/&nbsp;/g, ' ')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .trim();
  }

  /**
   * Send a push notification to Feishu channel
   */
  async send(options: PushChannelOptions): Promise<void> {
    if (!this.config.webhookUrl) {
      throw new Error('Feishu webhook URL is required');
    }

    try {
      const timestamp = Math.floor(Date.now() / 1000);

      // Strip HTML tags for plain text display
      const plainMsg = this.stripHtml(options.msg);

      // Build request body
      const body: Record<string, unknown> = {
        msg_type: 'text',
        content: {
          text: `${options.title}\n${plainMsg}`,
        },
      };

      // Add signature if secret is provided
      if (this.config.secret) {
        const sign = this.generateSignature(timestamp, this.config.secret);
        body.timestamp = timestamp.toString();
        body.sign = sign;
      }

      const response = await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as { code?: number };

      if (!response.ok || (result.code !== 0 && result.code !== undefined)) {
        throw new Error(`Feishu channel error: ${response.status} - ${JSON.stringify(result)}`);
      }

      logger.info(`Feishu notification sent successfully: ${options.title}`);
    } catch (error) {
      logger.error('Failed to send Feishu notification:', error);
      throw error;
    }
  }
}
