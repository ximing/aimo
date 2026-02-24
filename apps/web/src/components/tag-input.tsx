import { useState, useRef, useMemo } from 'react';
import { X, Tag } from 'lucide-react';
import type { TagDto } from '@aimo/dto';

interface TagInputProps {
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  existingTags: TagDto[];
  disabled?: boolean;
  placeholder?: string;
}

export const TagInput = ({
  tags,
  onTagsChange,
  existingTags,
  disabled = false,
  placeholder = '添加标签...',
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Compute suggestions using useMemo instead of useEffect to avoid cascading renders
  const suggestions = useMemo(() => {
    if (inputValue.trim()) {
      const normalizedInput = inputValue.trim().toLowerCase();
      // Filter existing tags that match input and aren't already selected
      return existingTags
        .filter(
          (tag) =>
            tag.name.toLowerCase().includes(normalizedInput) &&
            !tags.some((t) => t.toLowerCase() === tag.name.toLowerCase())
        )
        .slice(0, 5);
    }
    // Show most used tags when input is empty (but only when dropdown is open)
    return existingTags
      .filter(
        (tag) => !tags.some((t) => t.toLowerCase() === tag.name.toLowerCase())
      )
      .slice(0, 5);
  }, [inputValue, existingTags, tags]);

  const addTag = (tagName: string) => {
    const normalizedName = tagName.trim();
    if (!normalizedName) return;

    // Check for duplicates (case-insensitive)
    const isDuplicate = tags.some(
      (t) => t.toLowerCase() === normalizedName.toLowerCase()
    );
    if (isDuplicate) {
      setInputValue('');
      return;
    }

    onTagsChange([...tags, normalizedName]);
    setInputValue('');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((t) => t !== tagToRemove));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Auto-show suggestions when typing
    if (e.target.value.trim() && suggestions.length > 0) {
      setShowSuggestions(true);
    }
    setHighlightedIndex(-1);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Handle navigation in suggestions
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        return;
      }
      if (e.key === 'Enter' && highlightedIndex >= 0) {
        e.preventDefault();
        addTag(suggestions[highlightedIndex].name);
        return;
      }
    }

    // Add tag on Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
      return;
    }

    // Add tag on comma
    if (e.key === ',' || e.key === '，') {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
      }
      return;
    }

    // Remove last tag on backspace if input is empty
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
      return;
    }
  };

  const handleInputFocus = () => {
    // Show suggestions on focus if there are any unused tags
    const unusedTags = existingTags.filter(
      (tag) => !tags.some((t) => t.toLowerCase() === tag.name.toLowerCase())
    );
    if (unusedTags.length > 0 || suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Delay hiding to allow clicking on suggestions
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (containerRef.current && !containerRef.current.contains(relatedTarget)) {
      setShowSuggestions(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Tag pills container */}
      <div
        className={`flex flex-wrap items-center gap-2 p-2 border rounded-lg bg-white dark:bg-dark-800 transition-colors ${
          disabled
            ? 'border-gray-200 dark:border-dark-700 opacity-50 cursor-not-allowed'
            : 'border-gray-200 dark:border-dark-700 hover:border-gray-300 dark:hover:border-dark-600 focus-within:border-primary-400 dark:focus-within:border-primary-500'
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />

        {/* Selected tag pills */}
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-800 rounded-full text-xs text-primary-700 dark:text-primary-300"
          >
            <span>#{tag}</span>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                className="text-primary-400 hover:text-primary-600 dark:text-primary-500 dark:hover:text-primary-300 transition-colors cursor-pointer"
                aria-label={`Remove tag ${tag}`}
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </span>
        ))}

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          disabled={disabled}
          placeholder={tags.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none disabled:cursor-not-allowed"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg shadow-lg py-1 max-h-48 overflow-y-auto">
          <div className="px-3 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-dark-700">
            {inputValue.trim() ? '建议标签' : '热门标签'}
          </div>
          {suggestions.map((tag, index) => (
            <button
              key={tag.tagId}
              type="button"
              onClick={() => addTag(tag.name)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors ${
                index === highlightedIndex
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="text-primary-600 dark:text-primary-400">#</span>
                {tag.name}
              </span>
              {tag.usageCount !== undefined && tag.usageCount > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {tag.usageCount}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Helper text */}
      <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>按 Enter 或逗号添加标签</span>
        {tags.length > 0 && (
          <span className="text-gray-300 dark:text-gray-600">|</span>
        )}
        {tags.length > 0 && <span>{tags.length} 个标签</span>}
      </div>
    </div>
  );
};
