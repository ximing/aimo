/**
 * Push Channel Interface
 * Defines the contract for sending push notifications through different channels
 */

export interface PushChannelOptions {
  title: string; // Notification title
  msg: string; // Notification message content
  url?: string; // Optional URL to include in the notification
}

export interface PushChannel {
  /**
   * Send a push notification through this channel
   * @param options - The push notification options
   * @returns Promise<void> - Resolves when the notification is sent
   */
  send(options: PushChannelOptions): Promise<void>;
}
