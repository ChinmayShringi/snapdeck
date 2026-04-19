import { highlight, type SupportedLang } from '../lib/code-highlight';

export interface CodeBlockProps {
  readonly code: string;
  readonly lang?: SupportedLang;
  readonly label?: string;
}

/**
 * Server component. Highlights code at build time via shiki.
 * Input is authored statically in the docs, so the rendered HTML is trusted.
 */
export async function CodeBlock({ code, lang = 'tsx', label }: CodeBlockProps) {
  const html = await highlight(code, lang);
  return (
    <div className="my-5">
      {label ? (
        <div className="flex items-center justify-between border-b border-[var(--color-rule)] bg-[var(--color-canvas-raised)] px-3 py-2 font-mono text-[11px] text-[var(--color-ink-faint)]">
          <span>{label}</span>
          <span>{lang}</span>
        </div>
      ) : null}
      <div
        className="shiki-wrap overflow-hidden"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
