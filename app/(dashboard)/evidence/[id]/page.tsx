import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArtifactViewer } from "@/components/evidence/artifact-viewer";
import { ArrowLeft, Download } from "lucide-react";
import { format } from "date-fns";

export default async function ArtifactDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const artifact = await db.artifact.findUnique({
    where: { id: params.id },
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

  if (!artifact) notFound();

  const INTEGRATION_ICON: Record<string, string> = { GITHUB: "🐙", AWS: "☁️", JIRA: "🟦" };
  const controlTags: string[] = JSON.parse(artifact.controlTags);

  // Prepare viewer props
  let data: unknown = undefined;
  let textContent: string | undefined = undefined;

  if (artifact.type === "JSON") {
    try {
      data = JSON.parse(artifact.content.toString("utf-8"));
    } catch {
      textContent = artifact.content.toString("utf-8");
    }
  } else if (artifact.type === "TEXT" || artifact.type === "CSV") {
    textContent = artifact.content.toString("utf-8");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/evidence">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-zinc-100">{artifact.filename}</h1>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-zinc-400">
                {INTEGRATION_ICON[artifact.run.collector.integration.type]}{" "}
                {artifact.run.collector.integration.name}
              </span>
              <span className="text-zinc-600">·</span>
              <span className="text-sm text-zinc-400">{artifact.run.collector.evidenceType}</span>
            </div>
          </div>
        </div>
        <a href={`/api/artifacts/${artifact.id}`} download={artifact.filename}>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </a>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-zinc-400">Type</span>
                <Badge
                  variant={
                    artifact.type === "IMAGE"
                      ? "screenshot"
                      : artifact.type === "JSON"
                      ? "api"
                      : "default"
                  }
                >
                  {artifact.type}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">MIME</span>
                <span className="text-zinc-300 font-mono text-xs">{artifact.mimeType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Size</span>
                <span className="text-zinc-300">
                  {(artifact.content.length / 1024).toFixed(1)} KB
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Collected</span>
                <span className="text-zinc-300 text-xs">
                  {format(artifact.createdAt, "MMM d, yyyy HH:mm")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Run</span>
                <span className="text-zinc-300 font-mono text-xs">
                  {artifact.runId.slice(0, 8)}
                </span>
              </div>
            </CardContent>
          </Card>

          {controlTags.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Control Tags</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {controlTags.map((tag) => (
                  <Badge key={tag} variant="default">
                    {tag}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <ArtifactViewer
                artifactId={artifact.id}
                type={artifact.type as "IMAGE" | "JSON" | "CSV" | "TEXT"}
                data={data}
                textContent={textContent}
                imageUrl={artifact.type === "IMAGE" ? `/api/artifacts/${artifact.id}` : undefined}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
