import { db } from "@/lib/db";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Database } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

async function getIntegrations() {
  return db.integration.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { collectors: true } } },
  });
}

const TYPE_META: Record<string, { icon: string; label: string; badgeVariant: "github" | "aws" | "jira" }> = {
  GITHUB: { icon: "🐙", label: "GitHub", badgeVariant: "github" },
  AWS: { icon: "☁️", label: "AWS", badgeVariant: "aws" },
  JIRA: { icon: "🟦", label: "Jira", badgeVariant: "jira" },
};

export default async function IntegrationsPage() {
  const integrations = await getIntegrations();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Integrations</h1>
          <p className="mt-1 text-zinc-400">Connected systems for evidence collection</p>
        </div>
        <Link href="/integrations/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Integration
          </Button>
        </Link>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Database className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-4 text-zinc-400">No integrations yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Connect your first system to start collecting evidence.
            </p>
            <Link href="/integrations/new" className="mt-4 inline-block">
              <Button variant="outline" size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Integration
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {integrations.map((integration) => {
            const meta = TYPE_META[integration.type];
            return (
              <Link key={integration.id} href={`/integrations/${integration.id}`}>
                <Card className="h-full cursor-pointer transition-colors hover:border-zinc-700">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{meta?.icon}</span>
                        <div>
                          <p className="font-semibold text-zinc-100">{integration.name}</p>
                          <Badge variant={meta?.badgeVariant ?? "default"} className="mt-1">
                            {meta?.label ?? integration.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
                      <span>{integration._count.collectors} collector{integration._count.collectors !== 1 ? "s" : ""}</span>
                      <span>Added {formatDistanceToNow(integration.createdAt, { addSuffix: true })}</span>
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
