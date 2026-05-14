import { chromium, type Browser, type BrowserContext } from "playwright";
import path from "path";
import fs from "fs/promises";

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
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
}

export async function takeScreenshot(
  url: string,
  options: ScreenshotOptions
): Promise<{ buffer: Buffer; filePath: string }> {
  const browser = await getBrowser();
  let context: BrowserContext | null = null;

  try {
    context = await browser.newContext({
      viewport: {
        width: options.width ?? 1440,
        height: options.height ?? 900,
      },
    });

    if (options.cookies && options.cookies.length > 0) {
      await context.addCookies(options.cookies);
    }

    const page = await context.newPage();

    await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });

    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 10000 }).catch(() => {
        // Non-fatal — element may not exist
      });
    }

    const screenshotDir = path.join("/tmp", "grc-screenshots", options.runId);
    await fs.mkdir(screenshotDir, { recursive: true });

    const filePath = path.join(screenshotDir, options.filename);
    const buffer = await page.screenshot({
      path: filePath,
      fullPage: options.fullPage ?? true,
    });

    return { buffer, filePath };
  } finally {
    if (context) {
      await context.close();
    }
  }
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
