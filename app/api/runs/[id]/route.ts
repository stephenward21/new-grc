import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const run = await db.run.findUnique({
      where: { id: params.id },
      include: {
        collector: {
          include: {
            integration: { select: { id: true, name: true, type: true } },
          },
        },
        artifacts: {
          select: {
            id: true,
            type: true,
            filename: true,
            mimeType: true,
            createdAt: true,
            controlTags: true,
          },
        },
      },
    });

    if (!run) {
      return NextResponse.json({ error: "Run not found" }, { status: 404 });
    }

    return NextResponse.json(run);
  } catch (error) {
    console.error("Failed to get run:", error);
    return NextResponse.json({ error: "Failed to get run" }, { status: 500 });
  }
}
