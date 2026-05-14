import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") ?? "50", 10);
    const collectorId = searchParams.get("collectorId");

    const runs = await db.run.findMany({
      where: collectorId ? { collectorId } : undefined,
      orderBy: { startedAt: "desc" },
      take: limit,
      include: {
        collector: {
          select: {
            id: true,
            name: true,
            evidenceType: true,
            method: true,
            integration: { select: { id: true, name: true, type: true } },
          },
        },
        _count: { select: { artifacts: true } },
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error("Failed to list runs:", error);
    return NextResponse.json({ error: "Failed to list runs" }, { status: 500 });
  }
}
