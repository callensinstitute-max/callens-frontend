function parseCodeBlocks(content) {
  const parts = [];
  const pattern = /```([\w.+-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(content)) !== null) {
    const before = content.slice(lastIndex, match.index);
    if (before.trim()) {
      parts.push({ type: "text", value: before.trim() });
    }

    parts.push({
      type: "code",
      language: match[1] || "",
      value: match[2].trim(),
    });

    lastIndex = pattern.lastIndex;
  }

  const tail = content.slice(lastIndex);
  if (tail.trim()) {
    parts.push({ type: "text", value: tail.trim() });
  }

  return parts.length ? parts : [{ type: "text", value: content }];
}

function parseAgentSections(content) {
  const labels = ["Files read:", "Files changed:", "Commands run:", "Agent trace:"];
  const sections = [];
  let remaining = content;

  for (const label of labels) {
    const index = remaining.indexOf(label);
    if (index === -1) continue;

    const before = remaining.slice(0, index).trim();
    if (before) {
      sections.push(...parseCodeBlocks(before));
    }

    let nextIndex = remaining.length;
    for (const candidate of labels) {
      if (candidate === label) continue;
      const candidateIndex = remaining.indexOf(candidate, index + label.length);
      if (candidateIndex !== -1 && candidateIndex < nextIndex) {
        nextIndex = candidateIndex;
      }
    }

    const sectionBody = remaining
      .slice(index + label.length, nextIndex)
      .trim();

    sections.push({
      type: "list",
      label: label.replace(":", ""),
      items: sectionBody
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    });

    remaining = remaining.slice(nextIndex);
  }

  const tail = remaining.trim();
  if (tail) {
    sections.push(...parseCodeBlocks(tail));
  }

  return sections.length ? sections : parseCodeBlocks(content);
}

function AssistantContent({ content }) {
  const isThinking = content === "Callens is thinking...";
  const sections = parseAgentSections(content);

  return (
    <div className="w-full max-w-3xl">
      <div className="text-xs text-gray-500 mb-2">Callens</div>

      <div className="space-y-4 text-gray-100">
        {sections.map((section, index) => {
          if (section.type === "list") {
            return (
              <div
                key={`${section.label}-${index}`}
                className="rounded-2xl border border-gray-800 bg-gray-900/70 px-4 py-3"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  {section.label}
                </div>
                <div className="mt-2 space-y-1 text-sm text-gray-200 whitespace-pre-wrap break-words">
                  {section.items.map((item, itemIndex) => (
                    <div key={`${section.label}-${itemIndex}`}>{item}</div>
                  ))}
                </div>
              </div>
            );
          }

          if (section.type === "code") {
            return (
              <div
                key={`code-${index}`}
                className="rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3"
              >
                {section.language && (
                  <div className="mb-2 text-xs uppercase tracking-wide text-gray-500">
                    {section.language}
                  </div>
                )}
                <pre className="whitespace-pre-wrap break-words text-sm leading-relaxed text-gray-100">
                  <code>{section.value}</code>
                </pre>
              </div>
            );
          }

          return (
            <div
              key={`text-${index}`}
              className={
                isThinking
                  ? "callens-thinking-shine whitespace-pre-wrap break-words text-[15px] font-medium leading-8"
                  : "whitespace-pre-wrap break-words text-[15px] leading-8 text-gray-100"
              }
            >
              {section.value}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MessageBubble({ role, content }) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-xl rounded-2xl bg-blue-600 px-4 py-3 text-white">
          <div className="whitespace-pre-wrap break-words leading-relaxed">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-6">
      <AssistantContent content={content} />
    </div>
  );
}
