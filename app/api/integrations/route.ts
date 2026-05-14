import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const createIntegrationSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["GITHUB", "AWS", "JIRA"]),
  credentials: z.record(z.string()),
});

export async function GET() {
  try {
    const integrations = await db.integration.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { collectors: true } },
      },
    });
    return NextResponse.json(integrations);
  } catch (error) {
    console.error("Failed to list integrations:", error);
    return NextResponse.json({ error: "Failed to list integrations" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = createIntegrationSchema.parse(body);

    // NOTE: In production, credentials should be encrypted before storage.
    const integration = await db.integration.create({
      data: {
        name: parsed.name,
        type: parsed.type,
        credentials: JSON.stringify(parsed.credentials),
      },
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Failed to create integration:", error);
    return NextResponse.json({ error: "Failed to create integration" }, { status: 500 });
  }
}
