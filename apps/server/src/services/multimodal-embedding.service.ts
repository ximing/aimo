import { createHash } from 'node:crypto';

import { Service } from 'typedi';
import urllib from 'urllib';

import { config } from '../config/config.js';
import { LanceDbService as LanceDatabaseService } from '../sources/lancedb.js';

/**
 * Multimodal content types
 */
export type ModalityType = 'text' | 'image' | 'video' | 'multi_images' | 'vl';

/**
 * Multimodal content input
 */
export interface MultimodalContent {
  text?: string;
  image?: string; // URL or base64 encoded image
  video?: string; // URL or base64 encoded video
  multi_images?: string[]; // Multiple image URLs or base64 encoded images
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
  output?: {
    embeddings: DashScopeEmbedding[];
  };
  usage?: {
    input_tokens: number;
    image_tokens?: number;
    image_count?: number;
    duration?: number;
  };
  request_id?: string;
  code?: string;
  message?: string;
}

const MODEL_DIMENSIONS: Record<string, number[]> = {
  'qwen3-vl-embedding': [2560, 2048, 1536, 1024, 768, 512, 256],
  'qwen2.5-vl-embedding': [2048, 1024, 768, 512],
  'tongyi-embedding-vision-plus': [1152, 1024, 512, 256, 128, 64],
  'tongyi-embedding-vision-flash': [768, 512, 256, 128, 64],
};

const MODEL_DEFAULT_DIMENSIONS: Record<string, number> = {
  'qwen3-vl-embedding': 2560,
  'qwen2.5-vl-embedding': 1024,
  'tongyi-embedding-vision-plus': 1152,
  'tongyi-embedding-vision-flash': 768,
  'multimodal-embedding-v1': 1024,
};

const MULTI_IMAGE_MODELS = new Set([
  'tongyi-embedding-vision-plus',
  'tongyi-embedding-vision-flash',
]);

/**
 * Service for generating multimodal embeddings using DashScope API
 * Supports text, image, and video content with caching
 */
@Service()
export class MultimodalEmbeddingService {
  private dimension: number;
  private modelHash: string;
  private requestDimension?: number;

  constructor(private lanceDatabase: LanceDatabaseService) {
    this.dimension = this.resolveDimensionForModel();
    this.requestDimension = this.getRequestDimension();
    this.modelHash = this.generateModelHash();
  }

  /**
   * Generate a hash for the current model configuration
   */
  private generateModelHash(): string {
    const modelSignature: Record<string, unknown> = {
      model: config.multimodal.model,
      outputType: config.multimodal.outputType,
    };

    if (typeof this.requestDimension === 'number') {
      modelSignature.dimension = this.requestDimension;
    }

    if (typeof config.multimodal.fps === 'number') {
      modelSignature.fps = config.multimodal.fps;
    }

    return createHash('sha256').update(JSON.stringify(modelSignature)).digest('hex');
  }

  /**
   * Generate a hash for content (text, image URL, or video URL)
   */
  private generateContentHash(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private resolveDimensionForModel(): number {
    const allowedDimensions = MODEL_DIMENSIONS[config.multimodal.model];
    if (allowedDimensions) {
      if (allowedDimensions.includes(config.multimodal.dimension)) {
        return config.multimodal.dimension;
      }

      const fallback = MODEL_DEFAULT_DIMENSIONS[config.multimodal.model];
      if (typeof fallback === 'number') {
        console.warn(
          `Configured dimension ${config.multimodal.dimension} is not supported by model ${config.multimodal.model}, using ${fallback}`
        );
        return fallback;
      }

      console.warn(
        `Configured dimension ${config.multimodal.dimension} is not supported by model ${config.multimodal.model}`
      );
    }

    return MODEL_DEFAULT_DIMENSIONS[config.multimodal.model] ?? config.multimodal.dimension;
  }

  private getRequestDimension(): number | undefined {
    const allowedDimensions = MODEL_DIMENSIONS[config.multimodal.model];
    if (!allowedDimensions) {
      return undefined;
    }

    if (allowedDimensions.includes(config.multimodal.dimension)) {
      return config.multimodal.dimension;
    }

    const fallback = MODEL_DEFAULT_DIMENSIONS[config.multimodal.model];
    if (typeof fallback === 'number' && allowedDimensions.includes(fallback)) {
      console.warn(
        `Configured dimension ${config.multimodal.dimension} is not supported by model ${config.multimodal.model}, using ${fallback}`
      );
      return fallback;
    }

    console.warn(
      `Configured dimension ${config.multimodal.dimension} is not supported by model ${config.multimodal.model}`
    );
    return undefined;
  }

  private getModalityFlags(content: MultimodalContent) {
    const hasText = typeof content.text === 'string' && content.text.trim().length > 0;
    const hasImage = typeof content.image === 'string' && content.image.trim().length > 0;
    const hasVideo = typeof content.video === 'string' && content.video.trim().length > 0;
    const hasMultiImages =
      Array.isArray(content.multi_images) && content.multi_images.some(Boolean);

    return {
      hasText,
      hasImage,
      hasVideo,
      hasMultiImages,
    };
  }

  private resolveModalityType(content: MultimodalContent): ModalityType {
    const { hasText, hasImage, hasVideo, hasMultiImages } = this.getModalityFlags(content);
    const modalityCount =
      Number(hasText) + Number(hasImage) + Number(hasVideo) + Number(hasMultiImages);

    if (modalityCount === 0) {
      throw new Error('At least one of text, image, video, or multi_images must be provided');
    }

    if (hasMultiImages) {
      if (modalityCount > 1) {
        throw new Error('multi_images cannot be combined with other modalities');
      }
      return 'multi_images';
    }

    if (modalityCount > 1) {
      return 'vl';
    }

    if (hasText) {
      return 'text';
    }

    if (hasImage) {
      return 'image';
    }

    return 'video';
  }

  private serializeContent(content: MultimodalContent): string {
    const sanitized: Record<string, unknown> = {};

    if (content.text) {
      sanitized.text = content.text;
    }
    if (content.image) {
      sanitized.image = content.image;
    }
    if (content.video) {
      sanitized.video = content.video;
    }

    const multiImages = Array.isArray(content.multi_images)
      ? content.multi_images.filter(Boolean)
      : undefined;

    if (multiImages && multiImages.length > 0) {
      sanitized.multi_images = multiImages;
    }

    return JSON.stringify(sanitized);
  }

  private buildRequestParameters(
    contents: MultimodalContent[]
  ): Record<string, unknown> | undefined {
    const parameters: Record<string, unknown> = {};

    if (typeof this.requestDimension === 'number') {
      parameters.dimension = this.requestDimension;
    }

    if (config.multimodal.outputType) {
      parameters.output_type = config.multimodal.outputType;
    }

    if (this.hasVideo(contents) && typeof config.multimodal.fps === 'number') {
      parameters.fps = config.multimodal.fps;
    }

    return Object.keys(parameters).length > 0 ? parameters : undefined;
  }

  private hasVideo(contents: MultimodalContent[]): boolean {
    return contents.some((content) => Boolean(content.video));
  }

  private validateContents(contents: MultimodalContent[]): void {
    const hasMultiImages = contents.some(
      (content) => Array.isArray(content.multi_images) && content.multi_images.length > 0
    );

    if (hasMultiImages && !MULTI_IMAGE_MODELS.has(config.multimodal.model)) {
      throw new Error(`Model ${config.multimodal.model} does not support multi_images input`);
    }
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
      const cacheTable = await this.lanceDatabase.openTable('multimodal_embedding_cache');
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
      const cacheTable = await this.lanceDatabase.openTable('multimodal_embedding_cache');
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

    if (!contents || contents.length === 0) {
      throw new Error('Contents array cannot be empty');
    }

    this.validateContents(contents);

    const parameters = this.buildRequestParameters(contents);
    const payload: Record<string, unknown> = {
      model: config.multimodal.model,
      input: {
        contents,
      },
    };

    if (parameters) {
      payload.parameters = parameters;
    }

    try {
      const response = await urllib.request(
        `${config.multimodal.baseURL}/services/embeddings/multimodal-embedding/multimodal-embedding`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.multimodal.apiKey}`,
          },
          contentType: 'json',
          dataType: 'json',
          data: payload,
        }
      );

      const statusCode =
        typeof response.status === 'number' ? response.status : response.res?.statusCode;

      if (!statusCode || statusCode < 200 || statusCode >= 300) {
        throw new Error(
          `DashScope API call failed: ${statusCode ?? 'unknown'} - ${
            response.res?.statusMessage ?? 'Unknown error'
          }`
        );
      }

      const data = response.data as DashScopeResponse;
      if (data.code) {
        throw new Error(
          `DashScope API error: ${data.code}${data.message ? ` - ${data.message}` : ''}`
        );
      }

      if (!data.output?.embeddings || data.output.embeddings.length === 0) {
        throw new Error('DashScope API response missing embeddings');
      }

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
      this.validateContents([content]);
      const resolvedModalityType = this.resolveModalityType(content);
      const finalModalityType = modalityType ?? resolvedModalityType;
      const contentHash = this.generateContentHash(this.serializeContent(content));

      // Try to get from cache
      const cachedEmbedding = await this.queryCacheByHash(
        this.modelHash,
        contentHash,
        finalModalityType
      );

      if (cachedEmbedding) {
        console.log(`Cache hit for multimodal embedding (${finalModalityType})`);
        return cachedEmbedding;
      }

      // Cache miss, generate embedding
      console.log(
        `Cache miss for multimodal embedding (${finalModalityType}), generating new one...`
      );

      const embeddings = await this.callDashScopeAPI([content]);
      const embeddingResult =
        embeddings.find((embedding) => embedding.index === 0) ?? embeddings[0];

      if (!embeddingResult) {
        throw new Error('No embedding returned from DashScope API');
      }

      const embedding = embeddingResult.embedding;

      // Save to cache
      await this.saveToCache(this.modelHash, contentHash, finalModalityType, embedding);

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

      this.validateContents(contents);

      // Generate hashes and determine modality types for all contents
      const contentWithHashes = contents.map((item) => {
        const resolvedModalityType = this.resolveModalityType(item);
        const finalModalityType = item.modalityType ?? resolvedModalityType;

        return {
          content: item,
          modalityType: finalModalityType,
          contentHash: this.generateContentHash(this.serializeContent(item)),
        };
      });

      // Try to get all from cache
      const cachedResults: (number[] | null)[] = [];
      const indexesToGenerate: number[] = [];

      for (const [index, contentWithHash] of contentWithHashes.entries()) {
        const cached = await this.queryCacheByHash(
          this.modelHash,
          contentWithHash.contentHash,
          contentWithHash.modalityType
        );

        if (cached) {
          cachedResults[index] = cached;
        } else {
          cachedResults[index] = null;
          indexesToGenerate.push(index);
        }
      }

      // If all cached, return immediately
      if (indexesToGenerate.length === 0) {
        console.log(`Cache hit for all ${contents.length} multimodal embeddings`);
        return cachedResults as number[][];
      }

      // Generate embeddings for cache misses
      const contentsToGenerate = indexesToGenerate.map((index) => contentWithHashes[index].content);
      console.log(
        `Cache miss for ${indexesToGenerate.length} out of ${contents.length} multimodal embeddings, generating...`
      );

      const embeddings = await this.callDashScopeAPI(contentsToGenerate);
      const embeddingsByIndex = new Map<number, DashScopeEmbedding>();

      for (const embedding of embeddings) {
        embeddingsByIndex.set(embedding.index, embedding);
      }

      // Save to cache and merge results
      for (const [relativeIndex, originalIndex] of indexesToGenerate.entries()) {
        const embeddingResult = embeddingsByIndex.get(relativeIndex) ?? embeddings[relativeIndex];

        if (!embeddingResult) {
          throw new Error(`No embedding returned for index ${relativeIndex}`);
        }

        const embedding = embeddingResult.embedding;
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
