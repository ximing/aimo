/**
 * AI-related DTOs
 */

/**
 * Request DTO for generating tags from memo content
 */
export interface GenerateTagsRequestDto {
  memoId?: string; // Optional memo ID (if editing an existing memo)
  content: string; // Memo content to analyze
}

/**
 * Response DTO for generated tags
 */
export interface GenerateTagsResponseDto {
  tags: string[]; // Array of generated tag suggestions
}

/**
 * Request DTO for batch updating memo tags
 */
export interface UpdateMemoTagsRequestDto {
  tags: string[]; // Array of tag strings to set on the memo
}

/**
 * AI tool configuration for the frontend
 */
export interface AIToolConfigDto {
  id: string; // Tool identifier (e.g., 'generate-tags')
  name: string; // Display name
  description: string; // Tool description
  icon: string; // Icon identifier
}

/**
 * Available AI tools response
 */
export interface AIToolsListResponseDto {
  tools: AIToolConfigDto[];
}
