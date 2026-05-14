import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";

export function getSessionDir(integrationId: string): string {
  return path.join(os.homedir(), ".grc-sessions", integrationId);
}

export function getSessionReadyPath(integrationId: string): string {
  return path.join(getSessionDir(integrationId), "session-ready");
}

export async function hasActiveSession(integrationId: string): Promise<boolean> {
  return existsSync(getSessionReadyPath(integrationId));
}

export async function getSessionInfo(
  integrationId: string
): Promise<{ authenticated: boolean; lastAuthAt?: string }> {
  const readyPath = getSessionReadyPath(integrationId);
  try {
    const content = await fs.readFile(readyPath, "utf-8");
    return { authenticated: true, lastAuthAt: content.trim() };
  } catch {
    return { authenticated: false };
  }
}

export async function clearSession(integrationId: string): Promise<void> {
  const sessionDir = getSessionDir(integrationId);
  await fs.rm(sessionDir, { recursive: true, force: true });
}
