"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, Loader2, Clock, FileBox, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Run {
  id: string;
  status: "PENDING" | "RUNNING" | "SUCCESS" | "FAILED";
  startedAt: string;
  completedAt: string | null;
  error: string | null;
  _count: { artifacts: number };
}

interface Collector {
  id: string;
  name: string;
  evidenceType: string;
  method: "API" | "SCREENSHOT";
  config: Record<string, string>;
  schedule: string | null;
  lastRunAt: string | null;
  createdAt: string;
  integration: {
    id: string;
    name: string;
    type: string;
  };
  runs: Run[];
}

const STATUS_ICONS = {
  SUCCESS: <CheckCircle2 className="h-4 w-4 text-green-400" />,
  FAILED: <XCircle className="h-4 w-4 text-red-400" />,
  RUNNING: <Loader2 className="h-4 w-4 text-yellow-400 animate-spin" />,
  PENDING: <AlertCircle className="h-4 w-4 text-zinc-400" />,
};

const STATUS_BADGE_VARIANTS: Record<string, "success" | "destructive" | "warning" | "pending"> = {
  SUCCESS: "success",
  FAILED: "destructive",
  RUNNING: "warning",
  PENDING: "pending",
};

export default function CollectorDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [collector, setCollector] = useState<Collector | null>(null);
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCollector = useCallback(async () => {
    try {
      const res = await fetch(`/api/collectors/${id}`);
      if (res.ok) {
        const data = await res.json();
        setCollector(data);
      }
    } catch (err) {
      console.error("Failed to fetch collector", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCollector();
  }, [fetchCollector]);

  async function handleRun() {
    setRunning(true);
    setRunError(null);

    try {
      const res = await fetch(`/api/collectors/${id}/run`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Run failed");
      }
      await fetchCollector();
    } catch (err) {
      setRunError(err instanceof Error ? err.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
      </div>
    );
  }

  if (!collector) {
    return (
      <div className="py-12 text-center">
        <p className="text-zinc-400">Collector not found</p>
        <Link href="/collectors" className="mt-2 inline-block text-sm text-teal-400 hover:underline">
          ← Back to collectors
        </Link>
      </div>
    );
  }

  const INTEGRATION_ICON: Record<string, string> = { GITHUB: "🐙", AWS: "☁️", JIRA: "🟦" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/collectors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{collector.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-zinc-400">
                {INTEGRATION_ICON[collector.integration.type]} {collector.integration.name}
              </span>
              <Badge variant={collector.method === "API" ? "api" : "screenshot"}>
                {collector.method}
              </Badge>
            </div>
          </div>
        </div>
        <Button onClick={handleRun} disabled={running}>
          {running ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {running ? "Running..." : "Run Now"}
        </Button>
      </div>

      {runError && (
        <div className="rounded-lg border border-red-800 bg-red-900/30 px-4 py-3 text-sm text-red-400">
          Run failed: {runError}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Evidence Type</span>
                <span className="font-mono text-zinc-200">{collector.evidenceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Method</span>
                <Badge variant={collector.method === "API" ? "api" : "screenshot"}>
                  {collector.method}
                </Badge>
              </div>
              {collector.schedule && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Schedule</span>
                  <code className="text-xs text-teal-400">{collector.schedule}</code>
                </div>
              )}
              {collector.lastRunAt && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Last Run</span>
                  <span className="text-zinc-200">
                    {formatDistanceToNow(new Date(collector.lastRunAt), { addSuffix: true })}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-zinc-400">Created</span>
                <span className="text-zinc-200">
                  {formatDistanceToNow(new Date(collector.createdAt), { addSuffix: true })}
                </span>
              </div>
            </CardContent>
          </Card>

          {Object.keys(collector.config).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Params</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {Object.entries(collector.config).map(([key, val]) => (
                  <div key={key} className="flex justify-between gap-2">
                    <span className="text-zinc-400 shrink-0">{key}</span>
                    <span className="text-zinc-200 truncate font-mono text-xs">{String(val)}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Run History</CardTitle>
            </CardHeader>
            <CardContent>
              {collector.runs.length === 0 ? (
                <div className="py-10 text-center">
                  <Clock className="mx-auto h-8 w-8 text-zinc-600" />
                  <p className="mt-3 text-sm text-zinc-400">No runs yet</p>
                  <p className="mt-1 text-xs text-zinc-500">Click "Run Now" to collect evidence</p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {collector.runs.map((run) => (
                    <div key={run.id} className="py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {STATUS_ICONS[run.status]}
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={STATUS_BADGE_VARIANTS[run.status] ?? "default"}>
                                {run.status}
                              </Badge>
                              {run._count.artifacts > 0 && (
                                <span className="flex items-center gap-1 text-xs text-zinc-500">
                                  <FileBox className="h-3 w-3" />
                                  {run._count.artifacts} artifact{run._count.artifacts !== 1 ? "s" : ""}
                                </span>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-zinc-500">
                              {format(new Date(run.startedAt), "MMM d, yyyy HH:mm")}
                              {run.completedAt && (
                                <span className="ml-2">
                                  · {Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <Link href={`/evidence?runId=${run.id}`}>
                          <Button variant="ghost" size="sm" className="text-xs">
                            View artifacts
                          </Button>
                        </Link>
                      </div>
                      {run.error && (
                        <div className="mt-2 rounded bg-red-900/20 px-3 py-2 text-xs text-red-400 font-mono">
                          {run.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
