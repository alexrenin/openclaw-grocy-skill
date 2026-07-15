'use strict';

function richTextToPlainText(value) {
  const text = String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '• ')
    .replace(/<\/(?:p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => decodeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => decodeCodePoint(Number.parseInt(code, 16)));

  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/[\t ]+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function summarizeRichText(value, maxLength = 100) {
  const summary = richTextToPlainText(value).replace(/\s+/g, ' ').trim();
  const characters = Array.from(summary);

  if (characters.length <= maxLength) {
    return summary;
  }

  return `${characters.slice(0, Math.max(0, maxLength - 1)).join('')}…`;
}

function decodeCodePoint(codePoint) {
  if (!Number.isInteger(codePoint) || codePoint < 0 || codePoint > 0x10ffff) {
    return '';
  }

  return String.fromCodePoint(codePoint);
}

module.exports = {
  richTextToPlainText,
  summarizeRichText,
};
