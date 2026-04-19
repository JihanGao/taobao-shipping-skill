import { chromium, type BrowserContext } from "playwright";

import { taobaoShippingConfig } from "./config";
import { ensureDir } from "./fs";

export async function createTaobaoContext(options?: {
  headless?: boolean;
  storageState?: string;
}): Promise<BrowserContext> {
  await ensureDir(taobaoShippingConfig.localDir);

  const browser = await chromium.launch({
    channel: "chrome",
    headless: options?.headless ?? false,
  });

  const context = await browser.newContext({
    storageState: options?.storageState,
    viewport: { width: 1600, height: 1200 },
  });

  context.on("close", async () => {
    await browser.close();
  });

  return context;
}
