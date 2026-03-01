/**
 * Push Rule DTOs
 */

export type PushChannelType = 'meow' | 'feishu';

export interface PushChannelConfigDto {
  /** Channel type - 'meow' or 'feishu' */
  type: PushChannelType;
  /** Optional nickname for the channel */
  nickname?: string;
  /** Message type - defaults to 'text' (only for meow) */
  msgType?: 'text' | 'html';
  /** Height for HTML messages (only used when msgType is 'html' for meow) */
  htmlHeight?: number;
  /** Feishu webhook URL */
  webhookUrl?: string;
  /** Feishu signing secret (optional) */
  secret?: string;
}

export interface CreatePushRuleDto {
  /** Push rule name */
  name: string;
  /** Push time (hour of day, 0-23) */
  pushTime: number;
  /** Content type to push */
  contentType: 'daily_pick' | 'daily_memos';
  /** Array of channel configurations */
  channels: PushChannelConfigDto[];
}

export interface UpdatePushRuleDto {
  /** Push rule name */
  name?: string;
  /** Push time (hour of day, 0-23) */
  pushTime?: number;
  /** Content type to push */
  contentType?: 'daily_pick' | 'daily_memos';
  /** Array of channel configurations */
  channels?: PushChannelConfigDto[];
  /** Whether the push rule is enabled */
  enabled?: boolean;
}

export interface PushRuleDto {
  /** Unique push rule identifier */
  id: string;
  /** User ID who owns this push rule */
  uid: string;
  /** Push rule name */
  name: string;
  /** Push time (hour of day, 0-23) */
  pushTime: number;
  /** Content type to push */
  contentType: 'daily_pick' | 'daily_memos';
  /** Array of channel configurations */
  channels: PushChannelConfigDto[];
  /** Whether the push rule is enabled */
  enabled: boolean;
  /** Created timestamp in milliseconds */
  createdAt: number;
  /** Updated timestamp in milliseconds */
  updatedAt: number;
}
