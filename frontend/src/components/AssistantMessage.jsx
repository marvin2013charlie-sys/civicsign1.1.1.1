import React from "react";

/** Strip markdown the model may still emit — chat shows plain text only. */
function plainText(text) {
  return String(text)
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

/**
 * Formatted assistant bubble — short paragraphs and bullet lists, no markdown stars.
 */
export function AssistantMessage({ content, className = "" }) {
  const lines = plainText(content || "").split("\n");
  const nodes = [];
  let listItems = [];
  let listOrdered = false;

  const flushList = (key) => {
    if (!listItems.length) return;
    const ListTag = listOrdered ? "ol" : "ul";
    nodes.push(
      <ListTag
        key={`list-${key}`}
        className={`my-1.5 space-y-1.5 pl-4 ${listOrdered ? "list-decimal" : "list-disc"} marker:text-[var(--c-primary)]`}
      >
        {listItems.map((item, j) => (
          <li key={j} className="leading-relaxed text-[var(--c-ink)]">
            {item}
          </li>
        ))}
      </ListTag>,
    );
    listItems = [];
    listOrdered = false;
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const bullet = trimmed.match(/^•\s+(.*)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.*)$/);

    if (bullet) {
      if (listOrdered && listItems.length) flushList(i);
      listOrdered = false;
      listItems.push(bullet[1]);
      return;
    }
    if (numbered) {
      if (!listOrdered && listItems.length) flushList(i);
      listOrdered = true;
      listItems.push(numbered[1]);
      return;
    }

    flushList(i);
    if (!trimmed) {
      if (nodes.length) nodes.push(<div key={`sp-${i}`} className="h-2" aria-hidden />);
      return;
    }
    const isTip = /^tip:/i.test(trimmed);
    nodes.push(
      <p
        key={`p-${i}`}
        className={`leading-relaxed ${isTip ? "text-[13px] text-[var(--c-muted-fg)]" : "text-[var(--c-ink)]"}`}
      >
        {trimmed}
      </p>,
    );
  });
  flushList("end");

  return <div className={`space-y-0.5 ${className}`.trim()}>{nodes}</div>;
}