import { Service } from 'typedi';

import { logger } from '../../utils/logger.js';

import type { PushChannel, PushChannelOptions } from './push-channel.interface.js';

export interface MeowChannelConfig {
  nickname?: string; // Optional nickname for the channel
  msgType?: 'text' | 'html'; // Message type - defaults to 'text'
  htmlHeight?: number; // Height for HTML messages (only used when msgType is 'html')
}

/**
 * MeoW Channel Implementation
 * Sends push notifications to the MeoW (api.chuckfang.com) endpoint
 */
export class MeowChannel implements PushChannel {
  private readonly apiUrl = 'https://api.chuckfang.com';

  constructor(private config: MeowChannelConfig = {}) {}

  /**
   * Send a push notification to MeoW channel
   */
  async send(options: PushChannelOptions): Promise<void> {
    try {
      const messageType = this.config.msgType || 'text';
      const response = await fetch(`${this.apiUrl}/${this.config.nickname}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          msgType: messageType.toLocaleLowerCase(),
          title: options.title,
          msg: options.msg,
          url: options.url,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MeoW channel error: ${response.status} - ${errorText}`);
      }

      logger.info(`MeoW notification sent successfully: ${options.title}`);
    } catch (error) {
      logger.error('Failed to send MeoW notification:', error);
      throw error;
    }
  }
}
