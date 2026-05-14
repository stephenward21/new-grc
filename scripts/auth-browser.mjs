#!/usr/bin/env node
/**
 * Opens a visible browser for the user to authenticate with an integration.
 * Polls the page URL until authentication is detected, then saves a session-ready
 * marker to disk so subsequent Playwright runs can reuse the session.
 *
 * Usage: node scripts/auth-browser.mjs <integrationId> <integrationType> <loginUrl>
 */
import { chromium } from "playwright";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { homedir } from "os";

const [, , integrationId, integrationType, loginUrl] = process.argv;

if (!integrationId || !integrationType || !loginUrl) {
  console.error("Usage: auth-browser.mjs <integrationId> <integrationType> <loginUrl>");
  process.exit(1);
}

const sessionDir = join(homedir(), ".grc-sessions", integrationId);
await mkdir(sessionDir, { recursive: true });

console.log(`[grc-auth] Opening ${integrationType} login in a browser window...`);
console.log(`[grc-auth] Session directory: ${sessionDir}`);

const context = await chromium.launchPersistentContext(sessionDir, {
  headless: false,
  viewport: { width: 1440, height: 900 },
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});

const page = context.pages()[0] ?? await context.newPage();

try {
  await page.goto(loginUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
} catch {
  // Navigation timeout is non-fatal — user may already be redirecting
}

const POLL_INTERVAL_MS = 2000;
const TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const startedAt = Date.now();
let authenticated = false;

while (!authenticated && Date.now() - startedAt < TIMEOUT_MS) {
  await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

  let currentUrl = "";
  try {
    currentUrl = page.url();
  } catch {
    // Page may have been closed by the user — treat as cancelled
    break;
  }

  switch (integrationType) {
    case "AWS":
      authenticated =
        currentUrl.includes("console.aws.amazon.com") &&
        !currentUrl.includes("signin.aws.amazon.com");
      break;
    case "GITHUB":
      authenticated =
        currentUrl.startsWith("https://github.com") &&
        !currentUrl.includes("/login") &&
        !currentUrl.includes("/sessions");
      break;
    case "JIRA":
      // Jira redirects away from /login once auth is complete
      authenticated =
        !currentUrl.includes("/login") &&
        !currentUrl.includes("atlassian.net/login") &&
        currentUrl !== loginUrl;
      break;
    default:
      // Generic: assume auth when URL changes from the login page
      authenticated = currentUrl !== loginUrl && !currentUrl.includes("login");
  }

  if (authenticated) {
    console.log(`[grc-auth] Authentication detected at: ${currentUrl}`);
  }
}

if (authenticated) {
  await writeFile(join(sessionDir, "session-ready"), new Date().toISOString());
  console.log("[grc-auth] Session saved successfully.");
} else {
  console.log("[grc-auth] Authentication timed out or was cancelled.");
}

try {
  await context.close();
} catch {
  // Already closed
}

process.exit(0);
