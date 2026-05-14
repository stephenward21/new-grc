import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const updateCollectorSchema = z.object({
  name: z.string().min(1).optional(),
  method: z.enum(["API", "SCREENSHOT"]).optional(),
  config: z.record(z.unknown()).optional(),
  schedule: z.string().nullable().optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const collector = await db.collector.findUnique({
      where: { id: params.id },
      include: {
        integration: true,
        runs: {
          orderBy: { startedAt: "desc" },
          take: 20,
          include: {
            _count: { select: { artifacts: true } },
          },
        },
      },
    });

    if (!collector) {
      return NextResponse.json({ error: "Collector not found" }, { status: 404 });
    }

    return NextResponse.json(collector);
  } catch (error) {
    console.error("Failed to get collector:", error);
    return NextResponse.json({ error: "Failed to get collector" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateCollectorSchema.parse(body);

    const collector = await db.collector.update({
      where: { id: params.id },
      data: {
        ...parsed,
        config: parsed.config ? JSON.stringify(parsed.config) : undefined,
      },
      include: {
        integration: { select: { id: true, name: true, type: true } },
      },
    });

    return NextResponse.json(collector);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update collector:", error);
    return NextResponse.json({ error: "Failed to update collector" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.collector.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete collector:", error);
    return NextResponse.json({ error: "Failed to delete collector" }, { status: 500 });
  }
}
