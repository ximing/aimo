import { ChatOpenAI } from '@langchain/openai';
import { Service } from 'typedi';

import { config } from '../config/config.js';

/**
 * Service for AI-powered features
 * Provides centralized AI functionality including tag generation
 */
@Service()
export class AIService {
  private model: ChatOpenAI;

  constructor() {
    // Initialize LangChain ChatOpenAI
    this.model = new ChatOpenAI({
      modelName: config.openai.model || 'gpt-4o-mini',
      apiKey: config.openai.apiKey,
      configuration: {
        baseURL: config.openai.baseURL,
      },
      temperature: 0.3, // Lower temperature for consistent tag generation
    });
  }

  /**
   * Generate tag suggestions from memo content using AI
   * Returns 3-8 relevant tags based on content analysis
   *
   * @param content - The memo content to analyze
   * @returns Array of tag suggestions
   */
  async generateTags(content: string): Promise<string[]> {
    if (!content || content.trim().length === 0) {
      return [];
    }

    // Truncate content if too long (to keep API costs reasonable)
    const truncatedContent = content.slice(0, 2000);

    const systemPrompt = `You are an expert at content categorization and tagging. Your task is to analyze note content and generate relevant tags.

Guidelines for tag generation:
1. Generate 3-8 relevant tags based on the content
2. Tags should be concise (1-3 words each)
3. Include a mix of: topics, categories, key concepts, and themes
4. Use lowercase for consistency (unless proper nouns)
5. Avoid overly generic tags like "note" or "memo"
6. Tags should help with future retrieval and organization

You must respond with ONLY a JSON array of tag strings, like this:
["tag1", "tag2", "tag3"]

Do not include any explanation, markdown formatting, or additional text.`;

    const userPrompt = `Please analyze the following note content and generate relevant tags:

Content:
"""
${truncatedContent}
"""

Respond with a JSON array of 3-8 tag strings.`;

    try {
      const response = await this.model.invoke([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ]);

      const responseContent = typeof response.content === 'string' ? response.content : '';

      // Parse JSON response
      return this.parseTagsFromResponse(responseContent);
    } catch (error) {
      console.error('Error generating tags with AI:', error);
      throw new Error('Failed to generate tags');
    }
  }

  /**
   * Parse tags from AI response
   * Handles JSON arrays and common formatting variations
   */
  private parseTagsFromResponse(content: string): string[] {
    if (!content) {
      return [];
    }

    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const tags = JSON.parse(jsonMatch[0]) as string[];

        // Validate and clean tags
        return tags
          .filter((tag) => typeof tag === 'string' && tag.trim().length > 0)
          .map((tag) => tag.trim().toLowerCase())
          .slice(0, 8); // Ensure max 8 tags
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON:', parseError, 'Response:', content);
    }

    // Fallback: try to extract tags using regex patterns
    return this.extractTagsUsingRegex(content);
  }

  /**
   * Fallback method to extract tags using regex
   * Handles responses that aren't proper JSON
   */
  private extractTagsUsingRegex(content: string): string[] {
    const tags: string[] = [];

    // Try to find quoted strings that look like tags
    const quotePattern = /["']([^"']+)["']/g;
    let match;

    while ((match = quotePattern.exec(content)) !== null && tags.length < 8) {
      const tag = match[1].trim().toLowerCase();
      if (tag.length > 0 && !tags.includes(tag)) {
        tags.push(tag);
      }
    }

    // If still no tags, try comma-separated or line-separated
    if (tags.length === 0) {
      const lines = content
        .split(/[\n,]+/)
        .map((line) => line.replace(/^[\s\-•*]+/, '').trim().toLowerCase())
        .filter((line) => line.length > 0 && line.length < 50);

      for (const line of lines) {
        if (tags.length >= 8) break;
        if (!tags.includes(line)) {
          tags.push(line);
        }
      }
    }

    return tags;
  }
}
