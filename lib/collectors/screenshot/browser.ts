import { chromium, type Browser, type BrowserContext } from "playwright";
import path from "path";
import fs from "fs/promises";
import { hasActiveSession, getSessionDir } from "./session-manager";

let browserInstance: Browser | null = null;

async function getHeadlessBrowser(): Promise<Browser> {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }
  return browserInstance;
}

export interface ScreenshotOptions {
  runId: string;
  filename: string;
  fullPage?: boolean;
  waitForSelector?: string;
  cookies?: Array<{ name: string; value: string; domain: string; path: string }>;
  width?: number;
  height?: number;
  /** When provided, uses the saved persistent session for this integration (if one exists). */
  integrationId?: string;
}

export async function takeScreenshot(
  url: string,
  options: ScreenshotOptions
): Promise<{ buffer: Buffer; filePath: string }> {
  const screenshotDir = path.join("/tmp", "grc-screenshots", options.runId);
  await fs.mkdir(screenshotDir, { recursive: true });
  const filePath = path.join(screenshotDir, options.filename);

  // Use saved persistent session if one exists for this integration
  const usePersistentSession =
    options.integrationId && (await hasActiveSession(options.integrationId));

  if (usePersistentSession && options.integrationId) {
    return takeScreenshotWithSession(url, options, filePath);
  }

  return takeScreenshotFresh(url, options, filePath);
}

async function takeScreenshotWithSession(
  url: string,
  options: ScreenshotOptions,
  filePath: string
): Promise<{ buffer: Buffer; filePath: string }> {
  const sessionDir = getSessionDir(options.integrationId!);
  let context: BrowserContext | null = null;

  try {
    // launchPersistentContext restores cookies/localStorage from the saved session
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

    if (options.cookies && options.cookies.length > 0) {
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

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
