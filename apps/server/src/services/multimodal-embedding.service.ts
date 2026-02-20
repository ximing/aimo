import { createHash } from 'crypto';

import { Service } from 'typedi';

import { config } from '../config/config.js';
import { LanceDbService } from '../sources/lancedb.js';

/**
 * Multimodal content types
 */
export type ModalityType = 'text' | 'image' | 'video';

/**
 * Multimodal content input
 */
export interface MultimodalContent {
  text?: string;
  image?: string; // URL or base64 encoded image
  video?: string; // URL or base64 encoded video
}

/**
 * Multimodal embedding response from DashScope API
 */
interface DashScopeEmbedding {
  index: number;
  embedding: number[];
  type: ModalityType;
}

interface DashScopeResponse {
  output: {
    embeddings: DashScopeEmbedding[];
  };
  usage: {
    input_tokens: number;
    image_tokens?: number;
  };
}

/**
 * Service for generating multimodal embeddings using DashScope API
 * Supports text, image, and video content with caching
 */
@Service()
export class MultimodalEmbeddingService {
  private dimension: number;
  private modelHash: string;

  constructor(private lanceDb: LanceDbService) {
    this.dimension = config.multimodal.dimension;
    this.modelHash = this.generateModelHash();
  }

  /**
   * Generate a hash for the current model configuration
   */
  private generateModelHash(): string {
    const modelIdentifier = `${config.multimodal.model}:${config.multimodal.dimension}`;
    return createHash('sha256').update(modelIdentifier).digest('hex');
  }

  /**
   * Generate a hash for content (text, image URL, or video URL)
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  /**
   * Determine modality type from content URL or data
   */
  private determineModalityType(content: string): ModalityType {
    if (content.startsWith('data:image/') || content.includes('image/')) {
      return 'image';
    } else if (content.startsWith('data:video/') || content.includes('video/')) {
      return 'video';
    }
    return 'text';
  }

  /**
   * Query cache for multimodal embedding
   */
  private async queryCacheByHash(
    modelHash: string,
    contentHash: string,
    modalityType: ModalityType
  ): Promise<number[] | null> {
    try {
      const cacheTable = await this.lanceDb.openTable('multimodal_embedding_cache');
      const results = await cacheTable
        .query()
        .where(
          `modelHash = '${modelHash}' AND contentHash = '${contentHash}' AND modalityType = '${modalityType}'`
        )
        .limit(1)
        .toArray();

      if (results.length > 0) {
        return (results[0] as any).embedding;
      }
      return null;
    } catch (error) {
      console.warn('Warning: Cache query failed, will regenerate embedding:', error);
      return null;
    }
  }

  /**
   * Save multimodal embedding to cache
   */
  private async saveToCache(
    modelHash: string,
    contentHash: string,
    modalityType: ModalityType,
    embedding: number[]
  ): Promise<void> {
    try {
      const cacheTable = await this.lanceDb.openTable('multimodal_embedding_cache');
      await cacheTable.add([
        {
          modelHash,
          contentHash,
          modalityType,
          embedding,
          createdAt: Date.now(),
        } as Record<string, unknown>,
      ]);
    } catch (error) {
      console.warn('Warning: Failed to save multimodal embedding to cache:', error);
    }
  }

  /**
   * Call DashScope API to generate multimodal embeddings
   */
  private async callDashScopeAPI(contents: MultimodalContent[]): Promise<DashScopeEmbedding[]> {
    if (!config.multimodal.apiKey) {
      throw new Error('DASHSCOPE_API_KEY is not configured');
    }

    try {
      const response = await fetch(
        `${config.multimodal.baseURL}/services/embeddings/multimodal-embedding/multimodal-embedding`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.multimodal.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: config.multimodal.model,
            input: {
              contents,
            },
            parameters: {
              dimension: config.multimodal.dimension,
              output_type: config.multimodal.outputType,
              fps: config.multimodal.fps,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`DashScope API call failed: ${response.status} - ${response.statusText}`);
      }

      const data = (await response.json()) as DashScopeResponse;
      return data.output.embeddings;
    } catch (error) {
      throw new Error(
        `DashScope API call failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get multimodal embedding dimensions
   */
  getDimensions(): number {
    return this.dimension;
  }

  /**
   * Generate multimodal embedding for a single content (with caching)
   */
  async generateMultimodalEmbedding(
    content: MultimodalContent,
    modalityType?: ModalityType
  ): Promise<number[]> {
    try {
      // Determine the primary content and modality type
      let contentString: string | null = null;
      let detectedModalityType: ModalityType;

      if (content.text) {
        contentString = content.text;
        detectedModalityType = 'text';
      } else if (content.image) {
        contentString = content.image;
        detectedModalityType = 'image';
      } else if (content.video) {
        contentString = content.video;
        detectedModalityType = 'video';
      } else {
        throw new Error('At least one of text, image, or video must be provided');
      }

      // Override with explicit modalityType if provided
      if (modalityType) {
        detectedModalityType = modalityType;
      }

      const contentHash = this.generateContentHash(contentString);

      // Try to get from cache
      const cachedEmbedding = await this.queryCacheByHash(
        this.modelHash,
        contentHash,
        detectedModalityType
      );

      if (cachedEmbedding) {
        console.log(`Cache hit for multimodal embedding (${detectedModalityType})`);
        return cachedEmbedding;
      }

      // Cache miss, generate embedding
      console.log(
        `Cache miss for multimodal embedding (${detectedModalityType}), generating new one...`
      );

      const embeddings = await this.callDashScopeAPI([content]);

      if (embeddings.length === 0) {
        throw new Error('No embedding returned from DashScope API');
      }

      const embedding = embeddings[0].embedding;

      // Save to cache
      await this.saveToCache(this.modelHash, contentHash, detectedModalityType, embedding);

      return embedding;
    } catch (error) {
      console.error('Error generating multimodal embedding:', error);
      throw new Error(
        `Failed to generate multimodal embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate multimodal embeddings for multiple contents (with caching)
   */
  async generateMultimodalEmbeddings(
    contents: Array<MultimodalContent & { modalityType?: ModalityType }>
  ): Promise<number[][]> {
    try {
      if (!contents || contents.length === 0) {
        throw new Error('Contents array cannot be empty');
      }

      // Generate hashes and determine modality types for all contents
      const contentWithHashes = contents.map((item) => {
        let contentString: string | null = null;
        let modalityType: ModalityType;

        if (item.text) {
          contentString = item.text;
          modalityType = 'text';
        } else if (item.image) {
          contentString = item.image;
          modalityType = 'image';
        } else if (item.video) {
          contentString = item.video;
          modalityType = 'video';
        } else {
          throw new Error('At least one of text, image, or video must be provided');
        }

        // Override with explicit modalityType if provided
        if (item.modalityType) {
          modalityType = item.modalityType;
        }

        return {
          content: item,
          contentString,
          modalityType,
          contentHash: this.generateContentHash(contentString),
        };
      });

      // Try to get all from cache
      const cachedResults: (number[] | null)[] = [];
      const indexesToGenerate: number[] = [];

      for (let i = 0; i < contentWithHashes.length; i++) {
        const cached = await this.queryCacheByHash(
          this.modelHash,
          contentWithHashes[i].contentHash,
          contentWithHashes[i].modalityType
        );

        if (cached) {
          cachedResults[i] = cached;
        } else {
          cachedResults[i] = null;
          indexesToGenerate.push(i);
        }
      }

      // If all cached, return immediately
      if (indexesToGenerate.length === 0) {
        console.log(`Cache hit for all ${contents.length} multimodal embeddings`);
        return cachedResults as number[][];
      }

      // Generate embeddings for cache misses
      const contentsToGenerate = indexesToGenerate.map((i) => contentWithHashes[i].content);
      console.log(
        `Cache miss for ${indexesToGenerate.length} out of ${contents.length} multimodal embeddings, generating...`
      );

      const embeddings = await this.callDashScopeAPI(contentsToGenerate);

      // Save to cache and merge results
      for (let i = 0; i < embeddings.length; i++) {
        const originalIndex = indexesToGenerate[i];
        const embedding = embeddings[i].embedding;
        await this.saveToCache(
          this.modelHash,
          contentWithHashes[originalIndex].contentHash,
          contentWithHashes[originalIndex].modalityType,
          embedding
        );
        cachedResults[originalIndex] = embedding;
      }

      return cachedResults as number[][];
    } catch (error) {
      console.error('Error generating multimodal embeddings:', error);
      throw new Error(
        `Failed to generate multimodal embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
