"use client";

import { cn } from "@/lib/utils";
import { Database, Camera } from "lucide-react";

interface MethodSelectorProps {
  value: "API" | "SCREENSHOT" | null;
  onChange: (method: "API" | "SCREENSHOT") => void;
  supportsApi: boolean;
  supportsScreenshot: boolean;
}

export function MethodSelector({
  value,
  onChange,
  supportsApi,
  supportsScreenshot,
}: MethodSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        type="button"
        disabled={!supportsApi}
        onClick={() => supportsApi && onChange("API")}
        className={cn(
          "relative flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-colors",
          value === "API"
            ? "border-blue-600 bg-blue-950/40"
            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600",
          !supportsApi && "cursor-not-allowed opacity-40"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            value === "API" ? "bg-blue-900 text-blue-300" : "bg-zinc-700 text-zinc-400"
          )}
        >
          <Database className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-zinc-100">API Data</p>
          <p className="mt-1 text-sm text-zinc-400">
            Collect structured JSON data via the integration's API. Best for auditing records and
            configuration state.
          </p>
        </div>
        {value === "API" && (
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-blue-400" />
        )}
        {!supportsApi && (
          <span className="mt-1 text-xs text-zinc-500">Not available for this type</span>
        )}
      </button>

      <button
        type="button"
        disabled={!supportsScreenshot}
        onClick={() => supportsScreenshot && onChange("SCREENSHOT")}
        className={cn(
          "relative flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-colors",
          value === "SCREENSHOT"
            ? "border-purple-600 bg-purple-950/40"
            : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600",
          !supportsScreenshot && "cursor-not-allowed opacity-40"
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg",
            value === "SCREENSHOT"
              ? "bg-purple-900 text-purple-300"
              : "bg-zinc-700 text-zinc-400"
          )}
        >
          <Camera className="h-5 w-5" />
        </div>
        <div>
          <p className="font-semibold text-zinc-100">Screenshot</p>
          <p className="mt-1 text-sm text-zinc-400">
            Capture a visual screenshot of the relevant page using Playwright. Best for visual proof
            of UI state.
          </p>
        </div>
        {value === "SCREENSHOT" && (
          <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-purple-400" />
        )}
        {!supportsScreenshot && (
          <span className="mt-1 text-xs text-zinc-500">Not available for this type</span>
        )}
      </button>
    </div>
  );
}
