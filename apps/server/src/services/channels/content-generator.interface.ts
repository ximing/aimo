/**
 * Content Generator Interface
 * Generates push notification content based on content type
 */
export interface PushContent {
  /** Push notification title */
  title: string;
  /** Push notification message (can be HTML) */
  msg: string;
  /** Whether the message is HTML (affects escaping) */
  isHtml?: boolean;
}

export interface ContentGenerator {
  /**
   * Generate content based on content type and user
   * @param contentType - The type of content to generate (e.g., 'daily_pick', 'daily_memos')
   * @param uid - The user ID
   * @param msgType - The message type ('text' or 'html'), defaults to 'text'
   * @returns Generated push content with title and message
   */
  generate(contentType: string, uid: string, messageType?: 'text' | 'html'): Promise<PushContent>;
}
