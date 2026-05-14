import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity, Database, Plug, CheckCircle2, XCircle, Clock, FileBox } from "lucide-react";
import Link from "next/link";

async function getDashboardData() {
  const [integrationCount, collectorCount, recentRuns, artifactCount] = await Promise.all([
    db.integration.count(),
    db.collector.count(),
    db.run.findMany({
      orderBy: { startedAt: "desc" },
      take: 10,
      include: {
        collector: {
          include: {
            integration: { select: { name: true, type: true } },
          },
        },
        _count: { select: { artifacts: true } },
      },
    }),
    db.artifact.count(),
  ]);

  const successCount = await db.run.count({ where: { status: "SUCCESS" } });
  const failedCount = await db.run.count({ where: { status: "FAILED" } });

  return { integrationCount, collectorCount, recentRuns, artifactCount, successCount, failedCount };
}

const STATUS_BADGES: Record<string, React.ReactNode> = {
  SUCCESS: <Badge variant="success">SUCCESS</Badge>,
  FAILED: <Badge variant="destructive">FAILED</Badge>,
  RUNNING: <Badge variant="warning">RUNNING</Badge>,
  PENDING: <Badge variant="pending">PENDING</Badge>,
};

const INTEGRATION_ICON: Record<string, string> = {
  GITHUB: "🐙",
  AWS: "☁️",
  JIRA: "🟦",
};

export default async function DashboardPage() {
  const { integrationCount, collectorCount, recentRuns, artifactCount, successCount, failedCount } =
    await getDashboardData();

  const stats = [
    { label: "Integrations", value: integrationCount, icon: Plug, color: "text-teal-400" },
    { label: "Collectors", value: collectorCount, icon: Database, color: "text-blue-400" },
    { label: "Total Evidence", value: artifactCount, icon: FileBox, color: "text-purple-400" },
    { label: "Successful Runs", value: successCount, icon: CheckCircle2, color: "text-green-400" },
    { label: "Failed Runs", value: failedCount, icon: XCircle, color: "text-red-400" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
        <p className="mt-1 text-zinc-400">Overview of your compliance evidence collection</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm text-zinc-400">{label}</p>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <p className="mt-2 text-3xl font-bold text-zinc-100">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-zinc-400" />
            <CardTitle>Recent Runs</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {recentRuns.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-zinc-500">No runs yet.</p>
              <p className="mt-1 text-sm text-zinc-600">
                <Link href="/collectors/new" className="text-teal-400 hover:underline">
                  Create a collector
                </Link>{" "}
                to start collecting evidence.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {recentRuns.map((run) => (
                <div key={run.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {INTEGRATION_ICON[run.collector.integration.type] ?? "📋"}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-zinc-200">
                        {run.collector.name}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {run.collector.integration.name} · {run.collector.evidenceType}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <FileBox className="h-3 w-3" />
                      {run._count.artifacts} artifact{run._count.artifacts !== 1 ? "s" : ""}
                    </span>
                    {STATUS_BADGES[run.status]}
                    <span className="flex items-center gap-1 text-xs text-zinc-500">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(run.startedAt, { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
