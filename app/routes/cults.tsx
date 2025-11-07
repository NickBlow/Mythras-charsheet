import { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import cultsMarkdown from "~/content/cults.md?raw";

type Section = { title: string; body: string };

function splitSectionsByH2(markdown: string): Section[] {
  const lines = markdown.split(/\r?\n/);
  const sections: Section[] = [];
  let currentTitle: string | null = null;
  let buffer: string[] = [];
  for (const line of lines) {
    const match = /^##\s+(.*)$/.exec(line);
    if (match) {
      if (currentTitle) {
        sections.push({ title: currentTitle, body: buffer.join("\n").trim() });
      }
      currentTitle = match[1].trim();
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  if (currentTitle) {
    sections.push({ title: currentTitle, body: buffer.join("\n").trim() });
  }
  return sections;
}

export function meta() {
  return [
    { title: "Cults - Mythras Star Wars" },
    {
      name: "description",
      content: "Cults and organizations for Mythras Star Wars",
    },
  ];
}

export default function Cults() {
  const sections = useMemo(() => splitSectionsByH2(cultsMarkdown), []);
  const markdownComponents: Partial<Components> = {
    h3: ({ node, ...props }) => (
      <h3 {...props} className="text-2xl font-semibold glow-blue mt-6 mb-2" />
    ),
    h4: ({ node, ...props }) => (
      <h4 {...props} className="text-xl font-semibold text-cyan-300 mt-4" />
    ),
    h5: ({ node, ...props }) => (
      <h5 {...props} className="text-lg font-semibold text-cyan-200 mt-3" />
    ),
    h6: ({ node, ...props }) => (
      <h6 {...props} className="font-semibold text-cyan-200/80 mt-2" />
    ),
    hr: ({ node, ...props }) => (
      <hr {...props} className="my-6 border-gray-800" />
    ),
  };

  return (
    <main className="pt-16 p-4 container mx-auto">
      <div className="hologram p-8 rounded-lg space-y-4">
        {sections.map((section, idx) => (
          <details key={idx} className="collapsible hologram-border">
            <summary className="cursor-pointer select-none text-2xl px-4 py-3 glow-cyan">
              <span>{section.title}</span>
              <span className="ml-3 text-cyan-300/80 chevron inline-flex">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M8 5l8 7-8 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </summary>
            <div className="px-4 py-4 space-y-4">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {section.body}
              </ReactMarkdown>
            </div>
          </details>
        ))}
      </div>
    </main>
  );
}
