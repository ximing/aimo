import { Service } from 'typedi';

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
@Service()
export class MeowChannel implements PushChannel {
  private readonly apiUrl = 'https://api.chuckfang.com';

  constructor(private config: MeowChannelConfig = {}) {}

  /**
   * Send a push notification to MeoW channel
   */
  async send(options: PushChannelOptions): Promise<void> {
    try {
      const params = new URLSearchParams();

      if (this.config.nickname) {
        params.append('nickname', this.config.nickname);
      }

      const msgType = this.config.msgType || 'text';
      params.append('msgType', msgType);

      if (msgType === 'html' && this.config.htmlHeight) {
        params.append('htmlHeight', this.config.htmlHeight.toString());
      }

      params.append('title', options.title);
      params.append('msg', options.msg);

      if (options.url) {
        params.append('url', options.url);
      }

      const response = await fetch(`${this.apiUrl}?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`MeoW channel error: ${response.status} - ${errorText}`);
      }

      console.log(`MeoW notification sent successfully: ${options.title}`);
    } catch (error) {
      console.error('Failed to send MeoW notification:', error);
      throw error;
    }
  }
}
