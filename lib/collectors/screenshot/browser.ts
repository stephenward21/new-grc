import { chromium, type Browser, type BrowserContext } from "playwright";
import path from "path";
import fs from "fs/promises";
import {
  hasActiveSession,
  getSessionDir,
  getSessionType,
  getCdpPort,
} from "./session-manager";

let headlessBrowser: Browser | null = null;

async function getHeadlessBrowser(): Promise<Browser> {
  if (!headlessBrowser || !headlessBrowser.isConnected()) {
    headlessBrowser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return headlessBrowser;
}

export interface ScreenshotOptions {
  runId: string;
  filename: string;
  fullPage?: boolean;
  waitForSelector?: string;
  cookies?: Array<{ name: string; value: string; domain: string; path: string }>;
  width?: number;
  height?: number;
  /** When provided, uses the saved session for this integration (CDP or persistent). */
  integrationId?: string;
}

export async function takeScreenshot(
  url: string,
  options: ScreenshotOptions
): Promise<{ buffer: Buffer; filePath: string }> {
  const screenshotDir = path.join("/tmp", "grc-screenshots", options.runId);
  await fs.mkdir(screenshotDir, { recursive: true });
  const filePath = path.join(screenshotDir, options.filename);

  if (options.integrationId && (await hasActiveSession(options.integrationId))) {
    const type = await getSessionType(options.integrationId);
    if (type === "cdp") {
      return takeScreenshotViaCDP(url, options, filePath);
    }
    return takeScreenshotWithPersistentSession(url, options, filePath);
  }

  return takeScreenshotFresh(url, options, filePath);
}

/** Connect to the user's already-running browser via Chrome DevTools Protocol. */
async function takeScreenshotViaCDP(
  url: string,
  options: ScreenshotOptions,
  filePath: string
): Promise<{ buffer: Buffer; filePath: string }> {
  const port = await getCdpPort(options.integrationId!);
  const cdpUrl = `http://localhost:${port}`;

  const browser = await chromium.connectOverCDP(cdpUrl);
  let page;

  try {
    // Prefer an existing context (carries the live session cookies)
    const contexts = browser.contexts();
    const context = contexts[0] ?? (await browser.newContext());

    page = await context.newPage();
    await page.setViewportSize({
      width: options.width ?? 1440,
      height: options.height ?? 900,
    });
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    const buffer = await page.screenshot({ path: filePath, fullPage: options.fullPage ?? true });
    return { buffer: buffer as Buffer, filePath };
  } finally {
    if (page) await page.close();
    // Do NOT call browser.close() — that would close the user's real browser.
    // close() on a CDP-connected browser disconnects Playwright without killing Chrome
    await browser.close();
  }
}

/** Use a saved Playwright persistent context (cookies stored on disk). */
async function takeScreenshotWithPersistentSession(
  url: string,
  options: ScreenshotOptions,
  filePath: string
): Promise<{ buffer: Buffer; filePath: string }> {
  const sessionDir = getSessionDir(options.integrationId!);
  let context: BrowserContext | null = null;

  try {
    context = await chromium.launchPersistentContext(sessionDir, {
      headless: true,
      viewport: { width: options.width ?? 1440, height: options.height ?? 900 },
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 45000 });

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    const buffer = await page.screenshot({ path: filePath, fullPage: options.fullPage ?? true });
    return { buffer: buffer as Buffer, filePath };
  } finally {
    if (context) await context.close();
  }
}

/** Fresh headless browser with no session (public URLs only). */
async function takeScreenshotFresh(
  url: string,
  options: ScreenshotOptions,
  filePath: string
): Promise<{ buffer: Buffer; filePath: string }> {
  const browser = await getHeadlessBrowser();
  let context: BrowserContext | null = null;

  try {
    context = await browser.newContext({
      viewport: { width: options.width ?? 1440, height: options.height ?? 900 },
    });

    if (options.cookies?.length) {
      await context.addCookies(options.cookies);
    }

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {});
    }

    const buffer = await page.screenshot({ path: filePath, fullPage: options.fullPage ?? true });
    return { buffer: buffer as Buffer, filePath };
  } finally {
    if (context) await context.close();
  }
}

/** Test whether a Chrome CDP endpoint is reachable. */
export async function testCDPConnection(port: number): Promise<boolean> {
  try {
    const browser = await chromium.connectOverCDP(`http://localhost:${port}`, {
      timeout: 3000,
    });
    // close() on a CDP-connected browser disconnects Playwright without killing Chrome
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

export async function closeBrowser(): Promise<void> {
  if (headlessBrowser) {
    await headlessBrowser.close();
    headlessBrowser = null;
  }
}
