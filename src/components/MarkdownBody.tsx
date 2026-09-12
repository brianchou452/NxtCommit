import ReactMarkdown, { defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownBodyProps {
  markdown: string;
  sourceUrl: string;
}

function safeUrl(value: string, sourceUrl: string): string {
  const safeValue = defaultUrlTransform(value);
  if (!safeValue) return '';
  try {
    const url = new URL(safeValue, sourceUrl);
    return ['http:', 'https:', 'mailto:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

/** Render untrusted GitHub issue Markdown without accepting embedded HTML. */
export function MarkdownBody({ markdown, sourceUrl }: MarkdownBodyProps) {
  return <div className="c-markdown" data-testid="issue-body">
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      urlTransform={value => safeUrl(value, sourceUrl)}
      components={{
        a: props => <a {...props} target="_blank" rel="noreferrer noopener" />,
        img: props => <img {...props} loading="lazy" referrerPolicy="no-referrer" />,
      }}
    >{markdown}</ReactMarkdown>
  </div>;
}
