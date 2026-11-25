/**
 * Client-side HTML sanitizer shared by the public share portal and
 * DocPreview. Mirrors the Rust `sanitize_html` allowlist.
 */

const ALLOWED_TAGS = new Set([
  'p',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'a',
  'h1',
  'h2',
  'h3',
  'h4',
  'ul',
  'ol',
  'li',
  'blockquote',
  'hr',
  'br',
  'span',
  'div',
  'table',
  'thead',
  'tbody',
  'tr',
  'td',
  'th',
]);

// Elements whose text content is code/markup, never prose. When one of these
// shows up we drop it AND its text; for any other disallowed element we keep
// the text so "…<span>freelance</span>…" still reads as "freelance".
const OPAQUE_TAGS = new Set(['script', 'style', 'template', 'noscript', 'title', 'iframe']);

// Only these attributes survive, and only on these elements. Links are
// freelancer-authored (portfolio, payment URLs), so `a[href]` is allowed —
// but scheme-gated to http/https/mailto with rel=noopener, mirroring the
// Rust sanitize_html url_schemes. Images stay banned outright: unlike a
// visible link, an <img> phones home silently (tracking pixel).
const ALLOWED_ATTRS = 'colspan,rowspan';
const LINK_SCHEMES = /^(https?:|mailto:)/i;

// A malicious body can nest tags thousands deep; rebuilding the tree
// recursively would blow the stack. Past this depth we keep the text only.
const MAX_DEPTH = 100;

function copySafeAttrs(from: Element, to: Element): void {
  for (const name of ALLOWED_ATTRS.split(',')) {
    const value = from.getAttribute(name);
    // setAttribute, never innerHTML: the value cannot become markup.
    if (value !== null && /^\d{1,3}$/.test(value)) to.setAttribute(name, value);
  }
  if (to.tagName.toLowerCase() === 'a') {
    const href = (from.getAttribute('href') || '').trim();
    if (LINK_SCHEMES.test(href)) {
      to.setAttribute('href', href);
      to.setAttribute('rel', 'noopener');
    }
  }
}

function rebuildNode(doc: Document, node: Node, target: Element, depth: number): void {
  if (depth > MAX_DEPTH) return;

  if (node.nodeType === Node.TEXT_NODE) {
    target.appendChild(doc.createTextNode(node.nodeValue ?? ''));
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  if (OPAQUE_TAGS.has(tag)) return;

  if (!ALLOWED_TAGS.has(tag)) {
    // Unknown wrapper: keep the words inside it, discard the element itself.
    for (const child of Array.from(el.childNodes)) rebuildNode(doc, child, target, depth + 1);
    return;
  }

  const kept = doc.createElement(tag);
  copySafeAttrs(el, kept);
  for (const child of Array.from(el.childNodes)) rebuildNode(doc, child, kept, depth + 1);
  target.appendChild(kept);
}

/**
 * Client-side equivalent of the Rust `sanitize_html` allowlist.
 *
 * This parses with the browser's own HTML parser and rebuilds the tree node by
 * node. It must NOT be a regex filter: HTML5 accepts `/` as an attribute
 * separator (`<img/onerror=alert(1)>`), so any regex that assumes whitespace
 * before attributes is trivially bypassed, which is exactly how the previous
 * version of this function leaked every proposal body in the app.
 */
export function sanitizeShareHtml(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = doc.createElement('div');
  for (const child of Array.from(doc.body.childNodes)) rebuildNode(doc, child, out, 0);
  return out.innerHTML;
}

