import type { ReactNode } from "react";

/** Inert Markdown subset for release notes: no HTML, images or executable links. */
function inline(value: string): ReactNode[] {
  return value.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={index} className="font-semibold text-slate-100">
        {part.slice(2, -2)}
      </strong>
    ) : part.startsWith("`") && part.endsWith("`") ? (
      <code key={index} className="rounded bg-slate-800 px-1 py-0.5 text-xs text-sky-200">
        {part.slice(1, -1)}
      </code>
    ) : (
      part
    ),
  );
}

export function ReleaseNotes({ body }: { body: string }) {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (!line.trim()) continue;
    if (/^#{1,6}\s/.test(line)) {
      blocks.push(
        <h3 key={index} className="pt-2 text-sm font-semibold text-slate-100">
          {inline(line.replace(/^#{1,6}\s+/, ""))}
        </h3>,
      );
    } else if (/^\s*([-*+] |\d+\. )/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: ReactNode[] = [];
      const start = index;
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*+]\s+/;
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(<li key={index}>{inline(lines[index].replace(pattern, ""))}</li>);
        index++;
      }
      index--;
      blocks.push(
        ordered ? (
          <ol key={start} className="list-decimal space-y-2 pl-5">
            {items}
          </ol>
        ) : (
          <ul key={start} className="list-disc space-y-2 pl-5 marker:text-sky-400">
            {items}
          </ul>
        ),
      );
    } else {
      blocks.push(
        <p key={index} className="whitespace-pre-wrap">
          {inline(line)}
        </p>,
      );
    }
  }
  return (
    <div className="space-y-3 text-sm leading-7 text-slate-300 [overflow-wrap:anywhere]">
      {blocks}
    </div>
  );
}
