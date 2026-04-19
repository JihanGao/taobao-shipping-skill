import fs from "node:fs/promises";

import { type Locator } from "playwright";

import { createTaobaoContext } from "./browser";
import { taobaoShippingConfig } from "./config";

type LogisticsRow = {
  index: number;
  page: number;
  orderId: string;
  shopName: string;
  itemDescriptions: string[];
  itemSummary: string;
  carrier: string;
  tracking: string;
  orderStatus: string;
  logisticsStatus: string;
};

type CollectOptions = {
  page: number;
};

async function waitForOrders(pageLocator: Locator): Promise<void> {
  await pageLocator.first().waitFor({ state: "visible", timeout: 30_000 });
}

function normalizeText(value: string | null | undefined): string {
  return (value || "").replace(/\s+/g, " ").trim();
}

function parseArgs(argv: string[]): CollectOptions {
  let page = 1;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--page") {
      const next = Number(argv[i + 1]);
      if (Number.isInteger(next) && next > 0) {
        page = next;
        i += 1;
      }
    }
  }

  return { page };
}

async function collectItemDescriptions(card: Locator): Promise<string[]> {
  const rawTitles = await card.locator('[data-spm="suborder_itemtitle"]').allTextContents();
  const titles = rawTitles
    .map((title) => normalizeText(title).replace(/\[交易快照\]/g, "").trim())
    .filter(Boolean);

  return [...new Set(titles)];
}

async function jumpToPage(page: any, targetPage: number): Promise<void> {
  if (targetPage <= 1) {
    return;
  }

  const quickInput = page.locator(".ant-pagination-options-quick-jumper input").first();
  await quickInput.waitFor({ state: "visible", timeout: 15_000 });
  await quickInput.fill(String(targetPage));
  await quickInput.press("Enter");
  await page.waitForTimeout(2_500);
}

async function collectCurrentPage(page: any, currentPage: number): Promise<LogisticsRow[]> {
  const orderCards = page.locator('[id^="shopOrderContainer_"]');
  const cardCount = await orderCards.count();
  const results: LogisticsRow[] = [];
  let previousPopoverKey = "";

  for (let i = 0; i < cardCount; i += 1) {
    const card = orderCards.nth(i);
    const cardId = (await card.getAttribute("id")) || "";
    const orderId = cardId.replace("shopOrderContainer_", "");

    const logisticsButton = card.locator('div.trade-button:has-text("查看物流")').first();

    if ((await logisticsButton.count()) === 0) {
      continue;
    }

    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    const shopName = normalizeText(
      await card.locator('[data-spm="order_shopname"] a').first().textContent().catch(() => ""),
    );
    const itemDescriptions = await collectItemDescriptions(card);
    const itemSummary = itemDescriptions.join(" ; ");
    const orderStatus = normalizeText(
      await card.locator('[class*="shopInfoStatus"]').first().textContent().catch(() => ""),
    );

    let carrier = "";
    let tracking = "";
    let logisticsStatus = "";

    for (let attempt = 0; attempt < 4; attempt += 1) {
      await logisticsButton.hover({ force: true, timeout: 10_000 });
      const popover = page.locator(".ant-popover").filter({ hasText: "快递" }).last();

      try {
        await popover.waitFor({ state: "visible", timeout: 5_000 });
      } catch {
        await page.waitForTimeout(900);
        continue;
      }

      for (let poll = 0; poll < 8; poll += 1) {
        carrier = normalizeText(
          await popover.locator('[class*="popoverHeader"] span').first().textContent(),
        );
        tracking = normalizeText(
          await popover.locator('[class*="expressId"]').first().textContent(),
        );
        logisticsStatus = normalizeText(
          await popover.locator("li").first().textContent().catch(() => ""),
        );

        const popoverKey = `${carrier}||${tracking}||${logisticsStatus}`;
        if ((carrier || tracking) && popoverKey !== previousPopoverKey) {
          previousPopoverKey = popoverKey;
          break;
        }

        carrier = "";
        tracking = "";
        logisticsStatus = "";
        await page.waitForTimeout(400);
      }

      if (carrier || tracking) {
        break;
      }

      await page.waitForTimeout(900);
    }

    results.push({
      index: results.length + 1,
      page: currentPage,
      orderId,
      shopName,
      itemDescriptions,
      itemSummary,
      carrier,
      tracking,
      orderStatus,
      logisticsStatus,
    });

    await page.mouse.move(0, 0);
    await page.waitForTimeout(700);
    console.log(
      `${results.length}. ${orderId} | ${carrier || "-"} | ${tracking || "-"}`,
    );
  }

  return results;
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const context = await createTaobaoContext({
    headless: false,
    storageState: taobaoShippingConfig.storageStatePath,
  });

  try {
    const page = await context.newPage();
    await page.goto(taobaoShippingConfig.ordersUrl, {
      waitUntil: "domcontentloaded",
    });

    await waitForOrders(page.locator('[id^="shopOrderContainer_"]'));
    await jumpToPage(page, options.page);
    await waitForOrders(page.locator('[id^="shopOrderContainer_"]'));

    console.log(`Collecting page ${options.page}...`);
    const pageResults = await collectCurrentPage(page, options.page);

    await fs.writeFile(
      taobaoShippingConfig.outputPath,
      `${JSON.stringify(
        {
          page: options.page,
          collectedAt: new Date().toISOString(),
          rows: pageResults,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    console.log(`Saved ${pageResults.length} rows to ${taobaoShippingConfig.outputPath}`);
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
