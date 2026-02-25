/**
 * Push Rule DTOs
 */

export interface PushChannelConfigDto {
  type: 'meow'; // Channel type - currently only 'meow' is supported
  nickname?: string; // Optional nickname for the channel
  msgType?: 'text' | 'html'; // Message type - defaults to 'text'
  htmlHeight?: number; // Height for HTML messages (only used when msgType is 'html')
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
