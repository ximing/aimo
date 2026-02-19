import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';
import type { ExploreSourceDto } from '@aimo/dto';

interface MarkdownWithCitationsProps {
  content: string;
  sources: ExploreSourceDto[];
  onCitationClick: (memoId: string) => void;
}

/**
 * Custom component for citation links [1], [2], etc.
 * Renders as a clickable badge that highlights the corresponding source card
 */
const CitationLink = ({
  index,
  source,
  onClick,
}: {
  index: number;
  source?: ExploreSourceDto;
  onClick: () => void;
}) => {
  if (!source) {
    // If no source found for this citation, render as plain text
    return <span className="text-gray-500">[{index + 1}]</span>;
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center mx-0.5 px-1.5 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-400 rounded hover:bg-primary-200 dark:hover:bg-primary-900/60 transition-colors"
      title={`查看来源: ${source.title}`}
    >
      {index + 1}
    </button>
  );
};

/**
 * MarkdownWithCitations component
 * Renders markdown content with citation links [1], [2], etc. as clickable elements
 * that navigate to the corresponding source
 */
export const MarkdownWithCitations = ({
  content,
  sources,
  onCitationClick,
}: MarkdownWithCitationsProps) => {
  // Custom paragraph renderer to handle inline citations
  const components: Components = {
    p: ({ children }) => {
      // Process children to replace citation patterns with clickable links
      const processedChildren = processCitations(children, sources, onCitationClick);
      return <p className="mb-3 last:mb-0">{processedChildren}</p>;
    },
    li: ({ children }) => {
      // Also process citations in list items
      const processedChildren = processCitations(children, sources, onCitationClick);
      return <li>{processedChildren}</li>;
    },
    // Add other block-level elements that might contain citations
    h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
    h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
    h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
    ul: ({ children }) => <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
    code: ({ children }) => (
      <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-dark-700 rounded text-sm font-mono">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className="p-3 bg-gray-100 dark:bg-dark-700 rounded-lg overflow-x-auto mb-3">
        {children}
      </pre>
    ),
    blockquote: ({ children }) => (
      <blockquote className="pl-4 border-l-4 border-primary-300 dark:border-primary-700 italic text-gray-600 dark:text-gray-400 mb-3">
        {children}
      </blockquote>
    ),
  };

  return (
    <div className="prose dark:prose-invert prose-sm max-w-none">
      <ReactMarkdown components={components}>{content}</ReactMarkdown>
    </div>
  );
};

/**
 * Process React children to replace citation patterns [1], [2], etc. with CitationLink components
 * This handles both string content and nested React elements
 */
function processCitations(
  children: React.ReactNode,
  sources: ExploreSourceDto[],
  onCitationClick: (memoId: string) => void
): React.ReactNode {
  if (!children) return children;

  // If children is a string, process it for citations
  if (typeof children === 'string') {
    return parseCitations(children, sources, onCitationClick);
  }

  // If children is an array, process each child
  if (Array.isArray(children)) {
    return children.map((child, index) => {
      if (typeof child === 'string') {
        return (
          <React.Fragment key={index}>
            {parseCitations(child, sources, onCitationClick)}
          </React.Fragment>
        );
      }
      return child;
    });
  }

  // Return as-is for other types
  return children;
}

/**
 * Parse a string for citation patterns like [1], [2], etc.
 * Returns an array of text and CitationLink components
 */
function parseCitations(
  text: string,
  sources: ExploreSourceDto[],
  onCitationClick: (memoId: string) => void
): React.ReactNode[] {
  // Match citation patterns: [1], [2], etc.
  const citationRegex = /\[(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    const citationIndex = parseInt(match[1], 10) - 1; // Convert to 0-based index
    const beforeText = text.slice(lastIndex, match.index);

    // Add text before citation
    if (beforeText) {
      parts.push(beforeText);
    }

    // Add citation link
    const source = sources[citationIndex];
    parts.push(
      <CitationLink
        key={`${match.index}-${citationIndex}`}
        index={citationIndex}
        source={source}
        onClick={() => source && onCitationClick(source.memoId)}
      />
    );

    lastIndex = citationRegex.lastIndex;
  }

  // Add remaining text
  const remainingText = text.slice(lastIndex);
  if (remainingText) {
    parts.push(remainingText);
  }

  // If no citations found, return original text
  if (parts.length === 0) {
    return [text];
  }

  return parts;
}
