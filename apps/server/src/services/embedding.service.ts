import { Service } from 'typedi';
import { embedMany, embed } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { config } from '../config/config.js';

@Service()
export class EmbeddingService {
  private model: any;
  private dimensions: number;

  constructor() {
    // Initialize OpenAI client with custom base URL if needed
    const openaiClient = createOpenAI({
      apiKey: config.openai.apiKey,
      baseURL: config.openai.baseURL,
    });

    this.model = openaiClient.embedding(config.openai.model, {
      dimensions: config.openai.embeddingDimensions,
    });
    this.dimensions = config.openai.embeddingDimensions;
  }

  /**
   * Get embedding dimensions
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Generate embedding for a single text
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      if (!text || text.trim().length === 0) {
        throw new Error('Text cannot be empty');
      }

      const result = await embed({
        model: this.model,
        value: text,
      });

      return result.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(
        `Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
      if (!texts || texts.length === 0) {
        throw new Error('Texts array cannot be empty');
      }

      const result = await embedMany({
        model: this.model,
        values: texts,
      });

      return result.embeddings;
    } catch (error) {
      console.error('Error generating embeddings:', error);
      throw new Error(
        `Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
