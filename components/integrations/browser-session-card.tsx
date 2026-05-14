"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Monitor, Loader2, Unplug, RefreshCw, Square } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  integrationId: string;
  integrationType: string;
}

type SessionState =
  | { status: "loading" }
  | { status: "disconnected" }
  | { status: "connecting"; message: string }
  | { status: "connected"; lastAuthAt: string; type: "cdp" | "persistent"; cdpPort?: number };

type ConnectMode = "cdp" | "persistent";

export function BrowserSessionCard({ integrationId, integrationType }: Props) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });
  const [mode, setMode] = useState<ConnectMode>("cdp");
  const [cdpPort, setCdpPort] = useState("9222");
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/auth-session`);
      const data = await res.json();
      if (data.authenticated) {
        setSession({
          status: "connected",
          lastAuthAt: data.lastAuthAt,
          type: data.type ?? "persistent",
          cdpPort: data.cdpPort,
        });
      } else {
        setSession((prev) =>
          prev.status === "connecting" ? prev : { status: "disconnected" }
        );
      }
    } catch {
      setSession({ status: "disconnected" });
    }
  }, [integrationId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Poll while connecting via persistent session (waiting for user to log in)
  useEffect(() => {
    if (session.status !== "connecting") return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [session.status, fetchStatus]);

  async function handleConnect() {
    setError(null);
    setSession({ status: "connecting", message: "Connecting…" });

    try {
      const res = await fetch(`/api/integrations/${integrationId}/auth-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "cdp"
            ? { type: "cdp", port: parseInt(cdpPort, 10) || 9222 }
            : { type: "persistent" }
        ),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Connection failed.");
        setSession({ status: "disconnected" });
        return;
      }

      if (data.status === "connected") {
        // CDP connected immediately
        await fetchStatus();
      } else {
        // Persistent: waiting for user to log in in the opened window
        setSession({ status: "connecting", message: data.message });
      }
    } catch {
      setError("Failed to reach the server.");
      setSession({ status: "disconnected" });
    }
  }

  async function handleDisconnect() {
    await fetch(`/api/integrations/${integrationId}/auth-session`, { method: "DELETE" });
    setSession({ status: "disconnected" });
    setError(null);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-4 w-4 text-zinc-400" />
            Browser Session
          </CardTitle>
          {session.status === "connected" && <Badge variant="success">Active</Badge>}
          {session.status === "disconnected" && <Badge variant="default">Not connected</Badge>}
          {session.status === "connecting" && <Badge variant="warning">Connecting…</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-zinc-400">
          Required for screenshot collectors to capture authenticated{" "}
          {integrationType} console pages.
        </p>

        {session.status === "loading" && (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Checking session…
          </div>
        )}

        {session.status === "connected" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-teal-800 bg-teal-900/20 px-3 py-2 text-teal-300">
              {session.type === "cdp" ? (
                <>Using live Chrome session on port {session.cdpPort ?? 9222}</>
              ) : (
                <>Session active — screenshots use your saved browser profile.</>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500">
              <span>
                Connected{" "}
                {formatDistanceToNow(new Date(session.lastAuthAt), { addSuffix: true })}
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={fetchStatus}>
                  <RefreshCw className="h-3 w-3" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  <Unplug className="mr-1 h-3 w-3" />
                  Disconnect
                </Button>
              </div>
            </div>
          </div>
        )}

        {session.status === "connecting" && (
          <div className="space-y-3">
            <div className="rounded-lg border border-yellow-800 bg-yellow-900/20 px-3 py-2 text-yellow-300">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin flex-shrink-0" />
                <span>{session.message}</span>
              </div>
            </div>
            {mode === "persistent" && (
              <p className="text-xs text-zinc-500">
                Log in to {integrationType} in the browser window. This card updates automatically.
              </p>
            )}
          </div>
        )}

        {session.status === "disconnected" && (
          <div className="space-y-4">
            {/* Mode toggle */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMode("cdp"); setError(null); }}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                  mode === "cdp"
                    ? "border-teal-600 bg-teal-950/30"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <Monitor className="h-3.5 w-3.5" />
                  Current Browser
                </div>
                <p className="text-xs text-zinc-500">
                  Use your open {integrationType} session — no extra login
                </p>
              </button>
              <button
                onClick={() => { setMode("persistent"); setError(null); }}
                className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors ${
                  mode === "persistent"
                    ? "border-teal-600 bg-teal-950/30"
                    : "border-zinc-700 hover:border-zinc-600"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium text-zinc-200">
                  <Square className="h-3.5 w-3.5" />
                  New Window
                </div>
                <p className="text-xs text-zinc-500">
                  Open a browser window and log in manually
                </p>
              </button>
            </div>

            {/* CDP setup instructions */}
            {mode === "cdp" && (
              <div className="space-y-3">
                <div className="rounded-lg border border-zinc-700 bg-zinc-800/50 p-3 text-xs text-zinc-400 space-y-2">
                  <p className="font-medium text-zinc-300">One-time Chrome setup</p>
                  <p>Quit Chrome, then relaunch it with the remote debugging flag:</p>
                  <code className="block rounded bg-zinc-900 px-2 py-1.5 text-teal-400 break-all">
                    {`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --remote-debugging-port=9222`}
                  </code>
                  <p>Or on Windows:</p>
                  <code className="block rounded bg-zinc-900 px-2 py-1.5 text-teal-400 break-all">
                    {`chrome.exe --remote-debugging-port=9222`}
                  </code>
                  <p className="text-zinc-500">
                    Your existing tabs and sessions are preserved — Chrome starts normally with this flag.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cdp-port">Remote debugging port</Label>
                  <Input
                    id="cdp-port"
                    value={cdpPort}
                    onChange={(e) => setCdpPort(e.target.value)}
                    placeholder="9222"
                    className="font-mono"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-red-800 bg-red-900/20 px-3 py-2 text-xs text-red-400">
                {error}
              </div>
            )}

            <Button onClick={handleConnect} className="w-full">
              <Monitor className="mr-2 h-4 w-4" />
              {mode === "cdp" ? "Connect to Current Browser" : "Open Login Window"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
