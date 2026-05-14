import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createCollector } from "@/lib/collectors/registry";

type IntegrationType = "GITHUB" | "AWS" | "JIRA";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  // Fetch collector with integration
  const collector = await db.collector.findUnique({
    where: { id: params.id },
    include: { integration: true },
  });

  if (!collector) {
    return NextResponse.json({ error: "Collector not found" }, { status: 404 });
  }

  // Create a Run record in PENDING state
  const run = await db.run.create({
    data: {
      collectorId: collector.id,
      status: "PENDING",
    },
  });

  // Transition to RUNNING
  await db.run.update({
    where: { id: run.id },
    data: { status: "RUNNING" },
  });

  try {
    const credentials = JSON.parse(collector.integration.credentials) as Record<string, string>;
    const config = JSON.parse(collector.config) as Record<string, string>;

    const collectorInstance = createCollector(
      collector.integration.type as IntegrationType,
      {
        integrationId: collector.integrationId,
        evidenceType: collector.evidenceType,
        method: collector.method === "API" ? "api" : "screenshot",
        credentials,
        params: { ...config, runId: run.id },
      }
    );

    const result = await collectorInstance.collect();

    // Build artifact content buffer
    let artifactContent: Buffer;
    let artifactType: "JSON" | "CSV" | "IMAGE" | "TEXT";
    let mimeType: string;
    let filename: string;

    if (result.method === "screenshot" && result.screenshotBuffer) {
      artifactContent = result.screenshotBuffer;
      artifactType = "IMAGE";
      mimeType = "image/png";
      filename = `screenshot-${Date.now()}.png`;
    } else if (result.data !== undefined) {
      artifactContent = Buffer.from(JSON.stringify(result.data, null, 2), "utf-8");
      artifactType = "JSON";
      mimeType = "application/json";
      filename = `data-${Date.now()}.json`;
    } else {
      artifactContent = Buffer.from(
        JSON.stringify({ metadata: result.metadata, note: "No data collected" }, null, 2),
        "utf-8"
      );
      artifactType = "TEXT";
      mimeType = "text/plain";
      filename = `result-${Date.now()}.txt`;
    }

    // Save artifact
    const artifact = await db.artifact.create({
      data: {
        runId: run.id,
        type: artifactType,
        filename,
        content: artifactContent,
        mimeType,
        controlTags: "[]",
      },
    });

    // Mark run as successful
    const completedRun = await db.run.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        completedAt: new Date(),
      },
      include: {
        artifacts: { select: { id: true, type: true, filename: true, mimeType: true, createdAt: true } },
      },
    });

    // Update collector's lastRunAt
    await db.collector.update({
      where: { id: collector.id },
      data: { lastRunAt: new Date() },
    });

    return NextResponse.json({ run: completedRun, artifact }, { status: 200 });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Mark run as failed
    const failedRun = await db.run.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        error: errorMessage,
      },
    });

    return NextResponse.json(
      { error: errorMessage, run: failedRun },
      { status: 500 }
    );
  }
}
