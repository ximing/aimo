/**
 * AI-related DTOs
 */

/**
 * Request DTO for generating tags from memo content
 */
export interface GenerateTagsRequestDto {
  /** Optional memo ID (if editing an existing memo) */
  memoId?: string;
  /** Memo content to analyze */
  content: string;
}

/**
 * Response DTO for generated tags
 */
export interface GenerateTagsResponseDto {
  /** Array of generated tag suggestions */
  tags: string[];
}

/**
 * Request DTO for batch updating memo tags
 */
export interface UpdateMemoTagsRequestDto {
  /** Array of tag strings to set on the memo */
  tags: string[];
}

/**
 * AI tool configuration for the frontend
 */
export interface AIToolConfigDto {
  /** Tool identifier (e.g., 'generate-tags') */
  id: string;
  /** Display name */
  name: string;
  /** Tool description */
  description: string;
  /** Icon identifier */
  icon: string;
}

/**
 * Available AI tools response
 */
export interface AIToolsListResponseDto {
  /** Array of available AI tools */
  tools: AIToolConfigDto[];
}
