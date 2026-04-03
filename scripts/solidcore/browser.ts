import { chromium, type Browser, type BrowserContext } from "playwright";

import { solidcoreConfig } from "./config";
import { ensureDir } from "./fs";

export async function createSolidcoreContext(options?: {
  headless?: boolean;
  storageState?: string | undefined;
}): Promise<{ browser: Browser; context: BrowserContext }> {
  await ensureDir(solidcoreConfig.debugDir);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: options?.headless ?? true,
  });

  const context = await browser.newContext({
    storageState: options?.storageState,
    viewport: { width: 1440, height: 1200 },
  });

  return { browser, context };
}
