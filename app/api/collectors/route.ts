import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createCollectorSchema = z.object({
  name: z.string().min(1),
  integrationId: z.string(),
  evidenceType: z.string(),
  method: z.enum(["API", "SCREENSHOT"]),
  config: z.record(z.unknown()),
  schedule: z.string().nullable().optional(),
});

export async function GET() {
  try {
    const collectors = await db.collector.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        integration: { select: { id: true, name: true, type: true } },
        _count: { select: { runs: true } },
      },
    });
    return NextResponse.json(collectors);
  } catch (error) {
    console.error("Failed to list collectors:", error);
    return NextResponse.json({ error: "Failed to list collectors" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createCollectorSchema.parse(body);

    const integration = await db.integration.findUnique({
      where: { id: parsed.integrationId },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    const collector = await db.collector.create({
      data: {
        name: parsed.name,
        integrationId: parsed.integrationId,
        evidenceType: parsed.evidenceType,
        method: parsed.method,
        config: JSON.stringify(parsed.config),
        schedule: parsed.schedule ?? null,
      },
      include: {
        integration: { select: { id: true, name: true, type: true } },
      },
    });

    return NextResponse.json(collector, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create collector:", error);
    return NextResponse.json({ error: "Failed to create collector" }, { status: 500 });
  }
}
