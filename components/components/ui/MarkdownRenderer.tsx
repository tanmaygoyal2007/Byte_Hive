"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function parseMarkdownLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    parts.push(
      <Link key={match.index} href={match[2]} className="chat-link" style={{ color: "var(--primary-color, #2563eb)", textDecoration: "underline" }}>
        {match[1]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export default function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, index) => (
        <span key={index}>
          {index > 0 && <br />}
          {parseMarkdownLinks(line)}
        </span>
      ))}
    </>
  );
}
