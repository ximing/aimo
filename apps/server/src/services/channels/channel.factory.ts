import { Service } from 'typedi';

import { PushChannel } from './push-channel.interface.js';
import { MeowChannel, type MeowChannelConfig } from './meow.channel.js';

export type ChannelType = 'meow';

export interface ChannelConfig {
  type: ChannelType;
  nickname?: string;
  msgType?: 'text' | 'html';
  htmlHeight?: number;
}

/**
 * Channel Factory
 * Creates the appropriate channel adapter based on configuration
 */
@Service()
export class ChannelFactory {
  /**
   * Get a channel instance based on the configuration
   * @param config - The channel configuration
   * @returns A PushChannel instance
   * @throws Error if the channel type is not supported
   */
  getChannel(config: ChannelConfig): PushChannel {
    switch (config.type) {
      case 'meow':
        const meowConfig: MeowChannelConfig = {
          nickname: config.nickname,
          msgType: config.msgType,
          htmlHeight: config.htmlHeight,
        };
        return new MeowChannel(meowConfig);

      default:
        throw new Error(`Unsupported channel type: ${(config as any).type}`);
    }
  }
}
