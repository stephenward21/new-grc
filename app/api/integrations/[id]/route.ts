import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const updateIntegrationSchema = z.object({
  name: z.string().min(1).optional(),
  credentials: z.record(z.string()).optional(),
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const integration = await db.integration.findUnique({
      where: { id: params.id },
      include: {
        collectors: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!integration) {
      return NextResponse.json({ error: "Integration not found" }, { status: 404 });
    }

    return NextResponse.json(integration);
  } catch (error) {
    console.error("Failed to get integration:", error);
    return NextResponse.json({ error: "Failed to get integration" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const parsed = updateIntegrationSchema.parse(body);

    const integration = await db.integration.update({
      where: { id: params.id },
      data: {
        ...parsed,
        credentials: parsed.credentials ? JSON.stringify(parsed.credentials) : undefined,
      },
    });

    return NextResponse.json(integration);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to update integration:", error);
    return NextResponse.json({ error: "Failed to update integration" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await db.integration.delete({ where: { id: params.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Failed to delete integration:", error);
    return NextResponse.json({ error: "Failed to delete integration" }, { status: 500 });
  }
}
