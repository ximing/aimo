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

    const systemPrompt = `Role
你是一位资深的内容分析师与知识管理专家，擅长通过文本的表象捕捉其深层意图、学科分类及核心逻辑。

Task
请根据提供的文本，生成 3-8 个 高质量标签。

Tag Generation Principles (核心指令)
从“词”转向“意”：禁止简单地从文中截取长句或无意义的动宾短语。标签应当是文本所属的领域、底层逻辑、或核心价值的提炼。

多维度覆盖：

领域/学科（例：行为经济学、前端开发、正念冥想）

核心概念（例：沉没成本、第一性原理、异步处理）

应用场景/目的（例：决策优化、职场沟通、个人成长）

文体/属性（例：方法论、深度评论、技术指南）

颗粒度适中：避免过于宽泛（如“生活”、“技术”），也要避免过于琐碎（如“下午吃什么”）。

语言规范：统一使用小写（专有名词除外），每个标签 1-3 个词。

Workflow
Step 1: 阅读全文，识别作者的真实意图（他在解决什么问题？）。

Step 2: 将内容映射到已知的知识体系中。

Step 3: 筛选出对未来“检索”和“建立知识连接”最有帮助的标签。

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
