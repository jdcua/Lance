import { describe, it, expect } from 'vitest';
import { sanitizeShareHtml } from '../utils/shareHtml';

describe('sanitizeShareHtml links', () => {
  it('keeps https links with rel=noopener', () => {
    const out = sanitizeShareHtml('<p>See <a href="https://example.com/work">portfolio</a></p>');
    expect(out).toContain('<a href="https://example.com/work" rel="noopener">portfolio</a>');
  });

  it('keeps mailto links', () => {
    const out = sanitizeShareHtml('<a href="mailto:a@example.com">mail</a>');
    expect(out).toContain('mailto:a@example.com');
  });

  it('strips dangerous schemes but keeps the link text', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,<b>x</b>', 'vbscript:msgbox(1)']) {
      const out = sanitizeShareHtml(`<a href="${bad}">click</a>`);
      expect(out).not.toContain('href=');
      expect(out).toContain('click');
    }
  });

  it('strips event handlers and images', () => {
    expect(sanitizeShareHtml('<a href="https://example.com" onclick="alert(1)">x</a>')).not.toContain(
      'onclick',
    );
    const img = sanitizeShareHtml('<p>hi<img src="https://evil.test/pixel.gif"></p>');
    expect(img).not.toContain('<img');
    expect(img).toContain('hi');
  });
});
