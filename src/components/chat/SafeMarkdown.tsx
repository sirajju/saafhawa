'use client';

import React from 'react';

/**
 * Safely parses inline markdown (bold **text**, italics *text*, code `text`)
 * into React elements without using dangerouslySetInnerHTML.
 */
export function renderInlineMarkdown(text: string): React.ReactNode[] {
  // Tokenize bold (**...**), italic (*...* or _..._), and plain text
  const tokens: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|\*[^*\n]+?\*|_[^_\n]+?_|`[^`\n]+?`)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const matched = match[0];
    const key = `token-${match.index}`;

    if (matched.startsWith('**') && matched.endsWith('**')) {
      tokens.push(<strong key={key}>{matched.slice(2, -2)}</strong>);
    } else if (matched.startsWith('*') && matched.endsWith('*')) {
      tokens.push(<em key={key}>{matched.slice(1, -1)}</em>);
    } else if (matched.startsWith('_') && matched.endsWith('_')) {
      tokens.push(<em key={key}>{matched.slice(1, -1)}</em>);
    } else if (matched.startsWith('`') && matched.endsWith('`')) {
      tokens.push(
        <code key={key} className="rounded bg-[var(--surface-2)] px-1 py-0.5 text-xs">
          {matched.slice(1, -1)}
        </code>
      );
    } else {
      tokens.push(matched);
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : [text];
}

interface SafeMarkdownProps {
  content: string;
}

/**
 * Safely renders assistant message content with bold, italics, paragraphs,
 * and bullet/numbered lists without any raw HTML injection.
 */
export function SafeMarkdown({ content }: SafeMarkdownProps) {
  if (!content) return null;

  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let blockKey = 0;

  const flushList = () => {
    if (!currentList) return;
    const ListTag = currentList.type;
    const items = currentList.items;
    blocks.push(
      <ListTag
        key={`list-${blockKey++}`}
        className={`my-1.5 space-y-1 ${ListTag === 'ul' ? 'list-disc pl-5' : 'list-decimal pl-5'}`}
      >
        {items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Bullet item check (•, -, or *)
    const bulletMatch = /^[•\-*]\s+(.*)$/.exec(trimmed);
    if (bulletMatch) {
      if (currentList && currentList.type !== 'ul') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
      continue;
    }

    // Numbered item check (1., 2., etc.)
    const numberMatch = /^\d+\.\s+(.*)$/.exec(trimmed);
    if (numberMatch) {
      if (currentList && currentList.type !== 'ol') {
        flushList();
      }
      if (!currentList) {
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numberMatch[1]);
      continue;
    }

    // Regular line / paragraph
    flushList();
    blocks.push(
      <p key={`p-${blockKey++}`} className="leading-relaxed mb-2 last:mb-0">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  }

  flushList();

  return <div className="chat-markdown">{blocks}</div>;
}
