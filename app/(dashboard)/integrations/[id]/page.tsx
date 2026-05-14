import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Radio } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const TYPE_META: Record<string, { icon: string; label: string; badgeVariant: "github" | "aws" | "jira" }> = {
  GITHUB: { icon: "🐙", label: "GitHub", badgeVariant: "github" },
  AWS: { icon: "☁️", label: "AWS", badgeVariant: "aws" },
  JIRA: { icon: "🟦", label: "Jira", badgeVariant: "jira" },
};

export default async function IntegrationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const integration = await db.integration.findUnique({
    where: { id: params.id },
    include: {
      collectors: {
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { runs: true } } },
      },
    },
  });

  if (!integration) notFound();

  const meta = TYPE_META[integration.type];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/integrations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{meta?.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">{integration.name}</h1>
            <Badge variant={meta?.badgeVariant ?? "default"}>{meta?.label ?? integration.type}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Type</span>
                <span className="text-zinc-200">{integration.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Collectors</span>
                <span className="text-zinc-200">{integration.collectors.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Created</span>
                <span className="text-zinc-200">
                  {formatDistanceToNow(integration.createdAt, { addSuffix: true })}
                </span>
              </div>
              <div className="mt-2 rounded-lg border border-yellow-800 bg-yellow-900/20 px-3 py-2 text-xs text-yellow-400">
                Credentials stored as plaintext. Encrypt in production.
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Collectors</CardTitle>
                <Link href={`/collectors/new?integrationId=${integration.id}`}>
                  <Button size="sm">
                    <Plus className="mr-2 h-3 w-3" />
                    New Collector
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {integration.collectors.length === 0 ? (
                <div className="py-10 text-center">
                  <Radio className="mx-auto h-8 w-8 text-zinc-600" />
                  <p className="mt-3 text-sm text-zinc-400">No collectors yet</p>
                  <Link href={`/collectors/new?integrationId=${integration.id}`} className="mt-3 inline-block">
                    <Button variant="outline" size="sm">
                      <Plus className="mr-2 h-3 w-3" />
                      Create Collector
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {integration.collectors.map((collector) => (
                    <Link
                      key={collector.id}
                      href={`/collectors/${collector.id}`}
                      className="flex items-center justify-between py-3 hover:bg-zinc-800/30 -mx-2 px-2 rounded transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-200">{collector.name}</p>
                        <p className="text-xs text-zinc-500">{collector.evidenceType}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={collector.method === "API" ? "api" : "screenshot"}>
                          {collector.method}
                        </Badge>
                        <span className="text-xs text-zinc-500">{collector._count.runs} runs</span>
                      </div>
                    </Link>
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
