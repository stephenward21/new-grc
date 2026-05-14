"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Monitor, Loader2, Unplug, RefreshCw, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Props {
  integrationId: string;
  integrationType: string;
}

type SessionState =
  | { status: "loading" }
  | { status: "disconnected" }
  | { status: "connecting"; message: string }
  | { status: "connected"; lastAuthAt: string };

export function BrowserSessionCard({ integrationId, integrationType }: Props) {
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/integrations/${integrationId}/auth-session`);
      const data = await res.json();
      if (data.authenticated) {
        setSession({ status: "connected", lastAuthAt: data.lastAuthAt });
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

  // Poll while waiting for the user to log in in the opened window
  useEffect(() => {
    if (session.status !== "connecting") return;
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, [session.status, fetchStatus]);

  async function handleConnect() {
    setSession({ status: "connecting", message: "Opening browser window…" });
    try {
      const res = await fetch(`/api/integrations/${integrationId}/auth-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "persistent" }),
      });
      const data = await res.json();
      if (res.ok) {
        setSession({ status: "connecting", message: data.message });
      } else {
        setSession({ status: "disconnected" });
      }
    } catch {
      setSession({ status: "disconnected" });
    }
  }

  async function handleDisconnect() {
    await fetch(`/api/integrations/${integrationId}/auth-session`, { method: "DELETE" });
    setSession({ status: "disconnected" });
  }

  // AWS uses federation — no browser session setup needed
  if (integrationType === "AWS") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-teal-400" />
            Browser Session
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="rounded-lg border border-teal-800 bg-teal-900/20 px-3 py-2 text-teal-300">
            AWS screenshots use your stored credentials to generate a temporary
            federated sign-in URL automatically — no session setup required.
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Requires the IAM user to have{" "}
            <code className="text-zinc-400">sts:GetFederationToken</code> permission.
          </p>
        </CardContent>
      </Card>
    );
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
          {integrationType} pages.
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
              Session active — screenshots will use your saved browser profile.
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
            <p className="text-xs text-zinc-500">
              Log in to {integrationType} in the browser window. This card updates automatically.
            </p>
          </div>
        )}

        {session.status === "disconnected" && (
          <Button onClick={handleConnect} className="w-full">
            <Monitor className="mr-2 h-4 w-4" />
            Connect Browser Session
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
