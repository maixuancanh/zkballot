import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const dashboard = "http://localhost:5173/";
const explorer = "https://stellar.expert/explorer/testnet";
const contract = "CDDW36USNVE3Y2URBH2LXCCLFLFG65BWMHKEXUE23EMBBKOYTKA6Z4V6";

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function smoothScroll(page, selector, hold = 5000) {
  await page.locator(selector).scrollIntoViewIfNeeded();
  await pause(hold);
}

(async () => {
  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: "D:/dorahack/stellar/zkballot/video-demo/raw",
      size: { width: 1280, height: 720 },
    },
  });
  const page = await context.newPage();

  await page.goto(dashboard, { waitUntil: "networkidle", timeout: 30000 });
  await pause(2500);
  await page.getByRole("button", { name: "Connect demo session" }).click();
  await pause(1500);
  await page.getByRole("button", { name: "Create local identity" }).click();
  await pause(1500);
  await page.getByRole("button", { name: "Load verified registration" }).click();
  await page.getByRole("button", { name: "YES", exact: true }).click();
  await page.getByRole("button", { name: "Verify proof fixture" }).click();
  await pause(1500);
  await page.getByRole("button", { name: "Load verified vote" }).click();
  await pause(3000);

  await smoothScroll(page, "#zk-flow", 11000);
  await smoothScroll(page, "#evidence", 3000);
  await page.locator(".timeline-row").nth(0).scrollIntoViewIfNeeded();
  await pause(4000);
  await page.locator(".timeline-row").nth(4).scrollIntoViewIfNeeded();
  await pause(4000);
  await page.locator(".timeline-row").nth(5).scrollIntoViewIfNeeded();
  await pause(6000);

  await page.goto(`${explorer}/contract/${contract}`, {
    waitUntil: "domcontentloaded",
    timeout: 45000,
  });
  await pause(14000);
  await page.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
  await pause(8000);

  await page.goto(dashboard, { waitUntil: "networkidle", timeout: 30000 });
  await smoothScroll(page, ".rejection-proof", 10000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(7000);
  await smoothScroll(page, ".terminal-card", 8000);
  await smoothScroll(page, "#privacy", 10000);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await pause(8000);

  const video = page.video();
  await context.close();
  await browser.close();
  console.log(await video.path());
})();
