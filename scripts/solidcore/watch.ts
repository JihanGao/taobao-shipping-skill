import { solidcoreConfig } from "./config";
import { isExpectedReleaseWindow } from "./dates";

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  console.log(`Watcher started. Checking every ${solidcoreConfig.checkIntervalSeconds} seconds.`);

  for (;;) {
    const now = new Date();

    if (!isExpectedReleaseWindow(solidcoreConfig.expectedReleaseDays, now)) {
      console.log(`Skipping check at ${now.toISOString()} because today is outside the configured release window.`);
      await sleep(solidcoreConfig.checkIntervalSeconds * 1000);
      continue;
    }

    const { spawn } = await import("node:child_process");

    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ["--import", "tsx", "scripts/solidcore/check.ts"], {
        stdio: "inherit",
      });

      child.on("exit", (code) => {
        if (code === 0) {
          resolve();
          return;
        }

        reject(new Error(`solidcore:check exited with code ${code}`));
      });
    });

    await sleep(solidcoreConfig.checkIntervalSeconds * 1000);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
