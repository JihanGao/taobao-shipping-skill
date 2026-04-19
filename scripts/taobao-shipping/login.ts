import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { createTaobaoContext } from "./browser";
import { taobaoShippingConfig } from "./config";

async function main(): Promise<void> {
  const context = await createTaobaoContext({ headless: false });

  try {
    const page = await context.newPage();
    await page.goto(taobaoShippingConfig.ordersUrl, {
      waitUntil: "domcontentloaded",
    });

    const rl = createInterface({ input, output });
    try {
      await rl.question(
        "Log in to Taobao in the opened Chrome window, open the bought-items page, then press Enter here to save the session.",
      );
    } finally {
      rl.close();
    }

    await context.storageState({ path: taobaoShippingConfig.storageStatePath });
    console.log(`Saved storage state to ${taobaoShippingConfig.storageStatePath}`);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
