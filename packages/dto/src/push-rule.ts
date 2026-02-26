/**
 * Push Rule DTOs
 */

export type PushChannelType = 'meow' | 'feishu';

export interface PushChannelConfigDto {
  type: PushChannelType; // Channel type - 'meow' or 'feishu'
  nickname?: string; // Optional nickname for the channel
  msgType?: 'text' | 'html'; // Message type - defaults to 'text' (only for meow)
  htmlHeight?: number; // Height for HTML messages (only used when msgType is 'html' for meow)
  // Feishu specific config
  webhookUrl?: string; // Feishu webhook URL
  secret?: string; // Feishu signing secret (optional)
}

export interface CreatePushRuleDto {
  name: string;
  pushTime: number; // 0-23
  contentType: 'daily_pick' | 'daily_memos';
  channels: PushChannelConfigDto[]; // Array of channel configurations
}

export interface UpdatePushRuleDto {
  name?: string;
  pushTime?: number; // 0-23
  contentType?: 'daily_pick' | 'daily_memos';
  channels?: PushChannelConfigDto[]; // Array of channel configurations
  enabled?: boolean;
}

export interface PushRuleDto {
  id: string;
  uid: string;
  name: string;
  pushTime: number; // 0-23
  contentType: 'daily_pick' | 'daily_memos';
  channels: PushChannelConfigDto[]; // Array of channel configurations
  enabled: boolean;
  createdAt: number; // timestamp in milliseconds
  updatedAt: number; // timestamp in milliseconds
}
