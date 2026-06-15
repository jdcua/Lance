function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((para) => `<p>${para.split('\n').map((line) => escapeHtml(line)).join('<br>')}</p>`)
    .join('');
}

export function ensureHtml(content: string): string {
  if (!content.trim().startsWith('<')) return textToHtml(content);
  return content;
}
