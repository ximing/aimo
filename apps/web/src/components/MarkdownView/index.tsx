import { memo } from 'react';
import { marked } from 'marked'; // 或者 markdown-it
import DOMPurify from 'dompurify'; // 防止 XSS
import './styles.css';

// 扩展 marked 的解析规则，添加标签支持
marked.use({
  extensions: [
    {
      name: 'tag',
      level: 'inline',
      start(src: string) {
        return src.match(/(?:^|\s)#[\u4e00-\u9fa5\w-]+/)?.index;
      },
      tokenizer(src: string) {
        const rule = /^(?:^|\s)(#[\u4e00-\u9fa5\w-]+)/;
        const match = rule.exec(src);
        if (match) {
          return {
            type: 'tag',
            raw: match[0],
            text: match[1].slice(1), // 移除 # 符号
          };
        }
      },
      renderer(token: any) {
        return `<span class="markdown-tag">#${token.text}</span>`;
      },
    },
  ],
});

interface MarkdownViewProps {
  content: string;
  className?: string;
}

const MarkdownView = memo(({ content, className }: MarkdownViewProps) => {
  const html = DOMPurify.sanitize(marked(content));

  return (
    <div
      className={`markdown-view ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

export default MarkdownView;
