import { db } from "@/lib/db";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FileBox, ImageIcon, FileJson, FileText, FileSpreadsheet } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

async function getArtifacts(runId?: string) {
  return db.artifact.findMany({
    where: runId ? { runId } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      run: {
        include: {
          collector: {
            include: {
              integration: { select: { name: true, type: true } },
            },
          },
        },
      },
    },
  });
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  IMAGE: <ImageIcon className="h-5 w-5 text-purple-400" />,
  JSON: <FileJson className="h-5 w-5 text-blue-400" />,
  CSV: <FileSpreadsheet className="h-5 w-5 text-green-400" />,
  TEXT: <FileText className="h-5 w-5 text-zinc-400" />,
};

const INTEGRATION_ICON: Record<string, string> = {
  GITHUB: "🐙",
  AWS: "☁️",
  JIRA: "🟦",
};

export default async function EvidencePage({
  searchParams,
}: {
  searchParams: { runId?: string };
}) {
  const artifacts = await getArtifacts(searchParams.runId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Evidence Library</h1>
          <p className="mt-1 text-zinc-400">
            {searchParams.runId
              ? `Showing artifacts from run ${searchParams.runId.slice(0, 8)}`
              : `${artifacts.length} total artifact${artifacts.length !== 1 ? "s" : ""} collected`}
          </p>
        </div>
        {searchParams.runId && (
          <Link href="/evidence">
            <Badge variant="default" className="cursor-pointer hover:bg-zinc-700">
              Clear filter ×
            </Badge>
          </Link>
        )}
      </div>

      {artifacts.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FileBox className="mx-auto h-10 w-10 text-zinc-600" />
            <p className="mt-4 text-zinc-400">No evidence collected yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Run a collector to start collecting evidence artifacts.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {artifacts.map((artifact) => (
            <Link key={artifact.id} href={`/evidence/${artifact.id}`}>
              <Card className="h-full cursor-pointer transition-colors hover:border-zinc-600">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {TYPE_ICONS[artifact.type] ?? <FileBox className="h-5 w-5 text-zinc-400" />}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-100 truncate">
                          {artifact.filename}
                        </p>
                        <p className="text-xs text-zinc-500">{artifact.mimeType}</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex items-center gap-1 text-xs text-zinc-500">
                      <span>
                        {INTEGRATION_ICON[artifact.run.collector.integration.type]}{" "}
                        {artifact.run.collector.integration.name}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 truncate">
                      {artifact.run.collector.evidenceType}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Badge
                      variant={artifact.type === "IMAGE" ? "screenshot" : artifact.type === "JSON" ? "api" : "default"}
                    >
                      {artifact.type}
                    </Badge>
                    <span className="text-xs text-zinc-500">
                      {formatDistanceToNow(artifact.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
