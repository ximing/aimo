import OpenAI from 'openai';
import { env } from '@/config/env.js';
import { redisClient } from './redis.js';
import { createHash } from 'crypto';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
  baseURL: env.OPENAI_API_BASE_URL,
});

// 生成内容的哈希值作为缓存key
function generateCacheKey(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function generateEmbedding(text: string): Promise<string> {
  const cacheKey = `embedding:${generateCacheKey(text)}`;

  // 尝试从缓存获取
  const cachedEmbedding = await redisClient.get(cacheKey);
  if (cachedEmbedding) {
    return JSON.parse(cachedEmbedding);
  }

  // 如果缓存中没有，则调用API
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });

  const embedding = JSON.stringify(response.data[0].embedding);

  // 缓存结果，设置1周过期时间
  await redisClient.set(cacheKey, embedding, {
    EX: 700 * 24 * 60 * 60, // 700 days in seconds
  });

  return response.data[0].embedding;
}
