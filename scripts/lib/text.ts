// Small text utilities for picking the parts of a long, page-marked document
// (annual report / concall) that are relevant to a particular extraction, so we
// feed the model the pages that matter instead of 400 pages of boilerplate.

const PAGE_RE = /===== PAGE (\d+) =====/g;

export interface DocPage {
  page: number;
  text: string;
}

/** Split "===== PAGE n =====" page-marked text into pages. */
export function splitPages(marked: string): DocPage[] {
  if (!marked) return [];
  const pages: DocPage[] = [];
  const parts = marked.split(PAGE_RE);
  // parts = ["", "1", "<text1>", "2", "<text2>", ...]
  for (let i = 1; i < parts.length; i += 2) {
    const page = Number(parts[i]);
    const text = (parts[i + 1] ?? "").trim();
    if (text) pages.push({ page, text });
  }
  // No page markers (e.g. an HTML/text doc) — treat the whole thing as page 1.
  if (!pages.length && marked.trim()) pages.push({ page: 1, text: marked.trim() });
  return pages;
}

/**
 * Return the top-k most relevant pages of a page-marked document, scored by how
 * many of the `terms` / `hints` they contain (hints weighted higher). Returns the
 * concatenated text (page-marked) capped at `maxChars`, plus the page numbers.
 */
export function relevantPages(
  marked: string,
  terms: string[],
  hints: string[],
  count: number,
  maxChars: number,
): { text: string; pages: number[] } {
  const pages = splitPages(marked);
  if (!pages.length) return { text: "", pages: [] };

  const termRes = terms.map((t) => new RegExp(`\\b${escapeRe(t)}`, "i"));
  const hintRes = hints.map((h) => new RegExp(escapeRe(h), "i"));

  const scored = pages.map((p) => {
    const lower = p.text.toLowerCase();
    let score = 0;
    for (const re of termRes) if (re.test(lower)) score += 1;
    for (const re of hintRes) if (re.test(lower)) score += 3;
    return { ...p, score };
  });

  const top = scored
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score || a.page - b.page)
    .slice(0, count)
    .sort((a, b) => a.page - b.page);

  let out = "";
  const used: number[] = [];
  for (const p of top) {
    const block = `===== PAGE ${p.page} =====\n${p.text}`;
    if (out.length + block.length > maxChars) break;
    out += (out ? "\n\n" : "") + block;
    used.push(p.page);
  }
  return { text: out, pages: used };
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** First N chars of a document's text, for a coarse "give it the start" fallback. */
export function head(marked: string, maxChars: number): string {
  return marked.slice(0, maxChars);
}
