import { NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";
import { db } from "@/lib/db";
import {
  getSessionInfo,
  clearSession,
  saveSession,
} from "@/lib/collectors/screenshot/session-manager";
import { testCDPConnection } from "@/lib/collectors/screenshot/browser";

const LOGIN_URLS: Record<string, string> = {
  AWS: "https://console.aws.amazon.com/console/home",
  GITHUB: "https://github.com/login",
};

function getLoginUrl(type: string, credentials: Record<string, string>): string {
  if (type === "JIRA") {
    const host = credentials.host ?? "";
    return host ? `${host}/login` : "https://atlassian.net";
  }
  return LOGIN_URLS[type] ?? "about:blank";
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSessionInfo(params.id);
  return NextResponse.json(session);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const integration = await db.integration.findUnique({ where: { id: params.id } });
  if (!integration) {
    return NextResponse.json({ error: "Integration not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const sessionType = body.type === "cdp" ? "cdp" : "persistent";

  if (sessionType === "cdp") {
    const port = typeof body.port === "number" ? body.port : 9222;
    const reachable = await testCDPConnection(port);

    if (!reachable) {
      return NextResponse.json(
        {
          error: "cdp_unreachable",
          message: `Could not connect to Chrome on port ${port}. Make sure Chrome is running with --remote-debugging-port=${port}.`,
        },
        { status: 400 }
      );
    }

    await saveSession(params.id, "cdp", port);
    return NextResponse.json({
      status: "connected",
      type: "cdp",
      message: `Connected to your Chrome session on port ${port}. Screenshots will use your live browser.`,
    });
  }

  // Persistent session: spawn the auth browser script
  const credentials = JSON.parse(integration.credentials) as Record<string, string>;
  const loginUrl = getLoginUrl(integration.type, credentials);
  const scriptPath = path.join(process.cwd(), "scripts", "auth-browser.mjs");

  const child = spawn("node", [scriptPath, params.id, integration.type, loginUrl], {
    detached: true,
    stdio: "ignore",
  });
  child.unref();

  return NextResponse.json({
    status: "browser_opened",
    type: "persistent",
    message: `A browser window has opened. Log in to ${integration.type} and the session will be saved automatically.`,
    loginUrl,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  await clearSession(params.id);
  return new NextResponse(null, { status: 204 });
}
