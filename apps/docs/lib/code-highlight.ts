import { codeToHtml } from 'shiki';

export type SupportedLang =
  | 'tsx'
  | 'ts'
  | 'jsx'
  | 'js'
  | 'html'
  | 'bash'
  | 'json'
  | 'vue'
  | 'angular-ts'
  | 'css';

/**
 * Server-side syntax highlight using shiki.
 * Runs at build time during `next build` (static export).
 */
export async function highlight(code: string, lang: SupportedLang = 'tsx'): Promise<string> {
  return codeToHtml(code.trim(), {
    lang,
    theme: 'github-dark-default',
  });
}
