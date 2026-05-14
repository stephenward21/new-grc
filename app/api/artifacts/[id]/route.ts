import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const artifact = await db.artifact.findUnique({
      where: { id: params.id },
      include: {
        run: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            collector: {
              select: {
                id: true,
                name: true,
                evidenceType: true,
                method: true,
              },
            },
          },
        },
      },
    });

    if (!artifact) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }

    // For images, return binary content
    if (artifact.type === "IMAGE") {
      const buf = artifact.content as Buffer;
      const arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return new NextResponse(arrayBuf as ArrayBuffer, {
        headers: {
          "Content-Type": artifact.mimeType,
          "Content-Disposition": `inline; filename="${artifact.filename}"`,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    // For JSON, parse and return with metadata
    if (artifact.type === "JSON") {
      const text = artifact.content.toString("utf-8");
      try {
        const parsed = JSON.parse(text);
        return NextResponse.json({
          id: artifact.id,
          filename: artifact.filename,
          mimeType: artifact.mimeType,
          createdAt: artifact.createdAt,
          controlTags: JSON.parse(artifact.controlTags),
          run: artifact.run,
          data: parsed,
        });
      } catch {
        return NextResponse.json({
          id: artifact.id,
          filename: artifact.filename,
          mimeType: artifact.mimeType,
          createdAt: artifact.createdAt,
          controlTags: JSON.parse(artifact.controlTags),
          run: artifact.run,
          data: text,
        });
      }
    }

    // For text/CSV, return plain text
    const text = artifact.content.toString("utf-8");
    return new NextResponse(text, {
      headers: {
        "Content-Type": artifact.mimeType,
        "Content-Disposition": `inline; filename="${artifact.filename}"`,
      },
    });
  } catch (error) {
    console.error("Failed to get artifact:", error);
    return NextResponse.json({ error: "Failed to get artifact" }, { status: 500 });
  }
}
