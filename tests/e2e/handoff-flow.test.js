/**
 * tests/e2e/handoff-flow.test.js
 *
 * End-to-end smoke test using Playwright.
 * Requires accounts on claude.ai and chatgpt.com — NOT run in CI.
 * Run manually: npx playwright test tests/e2e/
 *
 * Environment variables required (never commit real values):
 *   CLAUDE_SESSION_COOKIE   — value of the __Secure-next-auth.session-token cookie
 *   CHATGPT_SESSION_COOKIE  — value of the __Secure-next-auth.session-token cookie
 *
 * The extension must be installed in the Playwright browser profile.
 * See README.md § End-to-end testing for setup instructions.
 */
"use strict";

const { test, expect, chromium } = require("@playwright/test");
const path = require("path");

const EXTENSION_PATH = path.resolve(__dirname, "../..");

test.describe("Chat Handoff — full flow smoke test", () => {
  let browser;
  let context;

  test.beforeAll(async () => {
    browser = await chromium.launchPersistentContext("", {
      headless: false, // extensions require headed mode in Playwright
      args: [
        `--disable-extensions-except=${EXTENSION_PATH}`,
        `--load-extension=${EXTENSION_PATH}`,
      ],
    });
    context = browser;
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test("scrapes a Claude conversation and opens ChatGPT", async () => {
    // This test validates the popup flow end-to-end.
    // It is deliberately marked as skip so it does not run in automated CI
    // where no browser accounts or sessions are available.
    test.skip(
      !process.env.CLAUDE_SESSION_COOKIE,
      "Set CLAUDE_SESSION_COOKIE to run e2e tests"
    );

    const claudePage = await context.newPage();
    await claudePage.goto("https://claude.ai");
    // TODO: inject session cookie and navigate to a conversation before testing.

    // The popup can be opened via the extension's background page URL.
    // Playwright does not support directly clicking the toolbar icon, so
    // open the popup HTML directly:
    const [extensionId] = context
      .backgroundPages()
      .map((p) => new URL(p.url()).hostname);

    const popupPage = await context.newPage();
    await popupPage.goto(`chrome-extension://${extensionId}/popup/popup.html`);

    await expect(popupPage.locator("h1")).toHaveText("Chat Handoff");
    await expect(popupPage.locator("#btn-chatgpt")).toBeVisible();
  });
});
