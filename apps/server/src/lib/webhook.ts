import { redisClient } from './redis.js';

export async function triggerWebhook(
  userId: number,
  event: string,
  payload: any
) {
  const webhooks = await redisClient.get(`webhooks:${userId}`);
  if (!webhooks) return;

  const webhookUrls = JSON.parse(webhooks);

  for (const url of webhookUrls) {
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          payload,
        }),
      });
    } catch (error) {
      console.error(`Webhook delivery failed to ${url}:`, error);
    }
  }
}
