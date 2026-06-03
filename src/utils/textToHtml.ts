export function textToHtml(text: string): string {
  return text
    .split('\n\n')
    .map((para) => `<p>${para.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function ensureHtml(content: string): string {
  if (!content.includes('<')) return textToHtml(content);
  return content;
}
