import { createHash } from 'node:crypto';

import { createOpenAI } from '@ai-sdk/openai';
import { embedMany, embed } from 'ai';
import { Service } from 'typedi';

import { config } from '../config/config.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';

@Service()
export class EmbeddingService {
  private model: any;
  private dimensions: number;
  private modelHash: string;

  constructor(private lanceDatabase: LanceDatabaseService) {
    // Initialize OpenAI client with custom base URL if needed
    const openaiClient = createOpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
    });

    this.model = openaiClient.embedding(config.openai.embeddingModel, {
      dimensions: config.openai.embeddingDimensions,
    });
    this.dimensions = config.openai.embeddingDimensions;

    // Generate model hash based on model name and dimensions
    this.modelHash = this.generateModelHash();
  }

  /**
   * Generate a hash for the current model configuration
   * This ensures cache invalidation when model or dimensions change
   */
  private generateModelHash(): string {
    const modelIdentifier = `${config.openai.embeddingModel}:${config.openai.embeddingDimensions}`;
    return createHash('sha256').update(modelIdentifier).digest('hex');
  }

  /**
   * Generate a hash for the given text content
   */
  private generateContentHash(text: string): string {
    return createHash('sha256').update(text).digest('hex');
  }

  /**
   * Query cache for embedding
   */
  private async queryCacheByHash(modelHash: string, contentHash: string): Promise<number[] | null> {
    try {
      const cacheTable = await this.lanceDatabase.openTable('embedding_cache');
      const results = await cacheTable
        .query()
        .where(`modelHash = '${modelHash}' AND contentHash = '${contentHash}'`)
        .limit(1)
        .toArray();

      if (results.length > 0) {
        return (results[0] as any).embedding;
      }
      return null;
    } catch (error) {
      // Cache query failure should not break embedding generation
      console.warn('Warning: Cache query failed, will regenerate embedding:', error);
      return null;
    }
  }

  /**
   * Save embedding to cache
   */
  private async saveToCache(
    modelHash: string,
    contentHash: string,
    embedding: number[]
  ): Promise<void> {
    try {
      const cacheTable = await this.lanceDatabase.openTable('embedding_cache');
      await cacheTable.add([
        {
          modelHash,
          contentHash,
          embedding,
          createdAt: Date.now(),
        } as Record<string, unknown>,
      ]);
    } catch (error) {
      // Cache save failure should not break embedding generation
      console.warn('Warning: Failed to save embedding to cache:', error);
    }
  }

  /**
   * Get embedding dimensions
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Generate embedding for a single text (with caching)
   * First checks cache, then calls API if not found, then saves to cache
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const contentHash = this.generateContentHash(text);

      // Try to get from cache
      const cachedEmbedding = await this.queryCacheByHash(this.modelHash, contentHash);
      if (cachedEmbedding) {
        console.log('Cache hit for embedding');
        return cachedEmbedding;
      }

      // Cache miss, generate embedding
      console.log('Cache miss for embedding, generating new one...');
      const result = await embed({
        model: this.model,
        value: text,
      });

      // Save to cache
      this.saveToCache(this.modelHash, contentHash, result.embedding);

      return result.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts (with caching)
   * Queries cache for all texts, only calls API for cache misses
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!texts || texts.length === 0) {
        throw new Error('Texts array cannot be empty');
      }

      // Generate hashes for all texts
      const textWithHashes = texts.map((text) => ({
        text,
        contentHash: this.generateContentHash(text),
      }));

      // Try to get all from cache
      const cachedResults: (number[] | null)[] = [];
      const indexesToGenerate: number[] = [];

      for (const [index, textWithHash] of textWithHashes.entries()) {
        const cached = await this.queryCacheByHash(this.modelHash, textWithHash.contentHash);
        if (cached) {
          cachedResults[index] = cached;
        } else {
          cachedResults[index] = null;
          indexesToGenerate.push(index);
        }
      }

      // If all cached, return immediately
      if (indexesToGenerate.length === 0) {
        console.log(`Cache hit for all ${texts.length} embeddings`);
        return cachedResults as number[][];
      }

      // Generate embeddings for cache misses
      const textsToGenerate = indexesToGenerate.map((index) => texts[index]);
      console.log(
        `Cache miss for ${indexesToGenerate.length} out of ${texts.length} embeddings, generating...`
      );

      const result = await embedMany({
        model: this.model,
        values: textsToGenerate,
      });

      // Save to cache and merge results
      for (const [index, originalIndex] of indexesToGenerate.entries()) {
        const embedding = result.embeddings[index];
        await this.saveToCache(
          this.modelHash,
          textWithHashes[originalIndex].contentHash,
          embedding
        );
        cachedResults[originalIndex] = embedding;
      }

      return cachedResults as number[][];
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
