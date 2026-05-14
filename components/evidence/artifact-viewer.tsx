"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown, ChevronRight } from "lucide-react";

interface ArtifactViewerProps {
  artifactId: string;
  type: "JSON" | "CSV" | "IMAGE" | "TEXT";
  data?: unknown;
  imageUrl?: string;
  textContent?: string;
}

function JsonTree({ data, depth = 0 }: { data: unknown; depth?: number }) {
  const [collapsed, setCollapsed] = useState(depth > 2);

  if (data === null) return <span className="text-zinc-500">null</span>;
  if (typeof data === "boolean") return <span className="text-yellow-400">{String(data)}</span>;
  if (typeof data === "number") return <span className="text-blue-400">{data}</span>;
  if (typeof data === "string") return <span className="text-green-400">"{data}"</span>;

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-zinc-400">[]</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-zinc-400 hover:text-zinc-200"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs text-zinc-500">[{data.length}]</span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-zinc-700 pl-4">
            {data.map((item, i) => (
              <div key={i} className="my-0.5">
                <span className="text-zinc-500 text-xs mr-2">{i}</span>
                <JsonTree data={item} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  if (typeof data === "object") {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) return <span className="text-zinc-400">{"{}"}</span>;
    return (
      <span>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="inline-flex items-center text-zinc-400 hover:text-zinc-200"
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronDown className="h-3 w-3" />
          )}
          <span className="ml-1 text-xs text-zinc-500">{"{"}...{"}"}</span>
        </button>
        {!collapsed && (
          <div className="ml-4 border-l border-zinc-700 pl-4">
            {entries.map(([key, val]) => (
              <div key={key} className="my-0.5 flex gap-2">
                <span className="text-purple-400 text-sm shrink-0">"{key}":</span>
                <JsonTree data={val} depth={depth + 1} />
              </div>
            ))}
          </div>
        )}
      </span>
    );
  }

  return <span className="text-zinc-300">{String(data)}</span>;
}

function CsvTable({ content }: { content: string }) {
  const lines = content.trim().split("\n");
  if (lines.length === 0) return <p className="text-zinc-500">Empty CSV</p>;

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-700">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left font-medium text-zinc-300">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800 hover:bg-zinc-800/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-zinc-400">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ArtifactViewer({
  artifactId,
  type,
  data,
  imageUrl,
  textContent,
}: ArtifactViewerProps) {
  if (type === "IMAGE") {
    const src = imageUrl ?? `/api/artifacts/${artifactId}`;
    return (
      <div className="rounded-lg border border-zinc-700 overflow-hidden bg-zinc-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt="Evidence screenshot"
          className="w-full h-auto"
        />
      </div>
    );
  }

  if (type === "CSV" && textContent) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-900 overflow-hidden">
        <CsvTable content={textContent} />
      </div>
    );
  }

  if (type === "JSON" && data !== undefined) {
    return (
      <div className="rounded-lg border border-zinc-700 bg-zinc-950 p-4 font-mono text-sm overflow-auto max-h-[600px]">
        <JsonTree data={data} depth={0} />
      </div>
    );
  }

  if (type === "TEXT" && textContent) {
    return (
      <pre className="rounded-lg border border-zinc-700 bg-zinc-950 p-4 font-mono text-sm text-zinc-300 overflow-auto max-h-[600px] whitespace-pre-wrap">
        {textContent}
      </pre>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-700 bg-zinc-900 p-8 text-center">
      <p className="text-zinc-500">No preview available</p>
    </div>
  );
}
