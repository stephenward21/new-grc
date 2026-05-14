import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";

export type SessionType = "persistent" | "cdp";

export function getSessionDir(integrationId: string): string {
  return path.join(os.homedir(), ".grc-sessions", integrationId);
}

export function getSessionReadyPath(integrationId: string): string {
  return path.join(getSessionDir(integrationId), "session-ready");
}

export function getSessionTypePath(integrationId: string): string {
  return path.join(getSessionDir(integrationId), "session-type");
}

export async function hasActiveSession(integrationId: string): Promise<boolean> {
  return existsSync(getSessionReadyPath(integrationId));
}

export async function getSessionType(integrationId: string): Promise<SessionType> {
  try {
    const content = await fs.readFile(getSessionTypePath(integrationId), "utf-8");
    return content.trim() === "cdp" ? "cdp" : "persistent";
  } catch {
    return "persistent";
  }
}

export async function saveSession(
  integrationId: string,
  type: SessionType,
  cdpPort?: number
): Promise<void> {
  const dir = getSessionDir(integrationId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(getSessionReadyPath(integrationId), new Date().toISOString());
  await fs.writeFile(getSessionTypePath(integrationId), type);
  if (type === "cdp" && cdpPort) {
    await fs.writeFile(path.join(dir, "cdp-port"), String(cdpPort));
  }
}

export async function getCdpPort(integrationId: string): Promise<number> {
  try {
    const content = await fs.readFile(
      path.join(getSessionDir(integrationId), "cdp-port"),
      "utf-8"
    );
    return parseInt(content.trim(), 10) || 9222;
  } catch {
    return 9222;
  }
}

export async function getSessionInfo(integrationId: string): Promise<{
  authenticated: boolean;
  lastAuthAt?: string;
  type?: SessionType;
  cdpPort?: number;
}> {
  const readyPath = getSessionReadyPath(integrationId);
  try {
    const content = await fs.readFile(readyPath, "utf-8");
    const type = await getSessionType(integrationId);
    const cdpPort = type === "cdp" ? await getCdpPort(integrationId) : undefined;
    return { authenticated: true, lastAuthAt: content.trim(), type, cdpPort };
  } catch {
    return { authenticated: false };
  }
}

export async function clearSession(integrationId: string): Promise<void> {
  const sessionDir = getSessionDir(integrationId);
  await fs.rm(sessionDir, { recursive: true, force: true });
}
