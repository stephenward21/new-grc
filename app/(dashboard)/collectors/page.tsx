import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Radio, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

async function getCollectors() {
  return db.collector.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      integration: { select: { id: true, name: true, type: true } },
      _count: { select: { runs: true } },
      runs: {
        orderBy: { startedAt: "desc" },
        take: 1,
        select: { status: true, startedAt: true },
      },
    },
  });
}

const STATUS_BADGE_VARIANTS: Record<string, "success" | "destructive" | "warning" | "pending"> = {
  SUCCESS: "success",
  FAILED: "destructive",
  RUNNING: "warning",
  PENDING: "pending",
};

const INTEGRATION_ICON: Record<string, string> = {
  GITHUB: "🐙",
  AWS: "☁️",
  JIRA: "🟦",
};

export default async function CollectorsPage() {
  const collectors = await getCollectors();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Collectors</h1>
          <p className="mt-1 text-zinc-400">Evidence collection configurations</p>
        </div>
        <Link href="/collectors/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Collector
          </Button>
        </Link>
      </div>

      {collectors.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Radio className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-4 text-zinc-400">No collectors yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Create a collector to start pulling evidence from your integrations.
            </p>
            <Link href="/collectors/new" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New Collector
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {collectors.map((collector) => {
            const lastRun = collector.runs[0];
            return (
              <Link key={collector.id} href={`/collectors/${collector.id}`}>
                <Card className="h-full cursor-pointer transition-colors hover:border-zinc-700">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-lg flex-shrink-0">
                          {INTEGRATION_ICON[collector.integration.type] ?? "📋"}
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-100 truncate">{collector.name}</p>
                          <p className="text-xs text-zinc-500 truncate">{collector.integration.name}</p>
                        </div>
                      </div>
                      <Badge variant={collector.method === "API" ? "api" : "screenshot"}>
                        {collector.method}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-1">
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Evidence type</span>
                        <span className="text-zinc-400 font-mono">{collector.evidenceType}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-500">
                        <span>Total runs</span>
                        <span className="text-zinc-400">{collector._count.runs}</span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      {lastRun ? (
                        <>
                          <Badge variant={STATUS_BADGE_VARIANTS[lastRun.status] ?? "default"}>
                            {lastRun.status}
                          </Badge>
                          <span className="flex items-center gap-1 text-xs text-zinc-500">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(lastRun.startedAt, { addSuffix: true })}
                          </span>
                        </>
                      ) : (
                        <span className="text-xs text-zinc-600">Never run</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
