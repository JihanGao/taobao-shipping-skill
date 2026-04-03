import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { solidcoreConfig } from "./config";
import { createSolidcoreContext } from "./browser";

async function main(): Promise<void> {
  const { browser, context } = await createSolidcoreContext({ headless: false });

  try {
    const page = await context.newPage();
    await page.goto(solidcoreConfig.loginUrl, { waitUntil: "domcontentloaded" });

    const rl = createInterface({ input, output });
    try {
      await rl.question(
        "Log in to your solidcore member account in the opened Chrome window, then press Enter here to save the session.",
      );
    } finally {
      rl.close();
    }

    await context.storageState({ path: solidcoreConfig.storageStatePath });
    console.log(`Saved storage state to ${solidcoreConfig.storageStatePath}`);
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
