/**
 * Shared search scoring for the Search screen and the command palette.
 * Replaces flat substring matching with ranked results:
 * exact > prefix > whole word > word-prefix > substring > typo.
 * Multi-word queries use AND semantics (every token must hit somewhere),
 * so "q3 campaign" finds "Campaign Q3". Typo tolerance is token-level and
 * conservative (tokens 4+ chars, similarity ≥ 0.75) to avoid noise.
 */

function fold(s: string): string {
  // Strip diacritics so "café" matches "cafe" and "Müller" matches "muller".
  // Freelancer client lists are full of accented names; exact-codepoint
  // matching would silently miss them.
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = next;
    }
  }
  return prev[b.length];
}

function typoTokenScore(words: string[], token: string): number {
  if (token.length < 4) return 0;
  let best = 0;
  for (const w of words) {
    if (!w || Math.abs(w.length - token.length) > 2) continue;
    const sim = 1 - levenshtein(w, token) / Math.max(w.length, token.length);
    if (sim > best) best = sim;
  }
  // Below a true substring hit so exact text always outranks guesses.
  if (best >= 0.75) return 0.3 + best * 0.2;
  return 0;
}

function tokenScore(field: string, token: string): number {
  if (!token || !field) return 0;
  if (field === token) return 1;
  if (field.startsWith(token)) return 0.9;
  const words = field.split(/[^a-z0-9]+/).filter(Boolean);
  if (words.includes(token)) return 0.85;
  if (words.some((w) => w.startsWith(token))) return 0.7;
  if (field.includes(token)) return 0.5;
  return typoTokenScore(words, token);
}

/** Mean token score across fields; 0 when any token misses everywhere. */
export function matchScore(texts: string[], query: string): number {
  const tokens = fold(query).trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return 0;
  const fields = texts.map((t) => fold(t));
  let total = 0;
  for (const tok of tokens) {
    let best = 0;
    for (const f of fields) best = Math.max(best, tokenScore(f, tok));
    if (best === 0) return 0;
    total += best;
  }
  return total / tokens.length;
}

/** Filter + best-first rank, capped. Empty query yields nothing. */
export function rankSearch<T>(
  items: T[],
  texts: (item: T) => string[],
  query: string,
  limit = 25,
): T[] {
  if (!query.trim()) return [];
  return items
    .map((item) => ({ item, score: matchScore(texts(item), query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.item);
}
