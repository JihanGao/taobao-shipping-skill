import fs from "node:fs/promises";

import { taobaoShippingConfig } from "./config";

type CollectedRow = {
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

type CollectedPayload = {
  page: number;
  collectedAt: string;
  rows: CollectedRow[];
};

type SheetPayload = {
  title: string;
  headers: string[];
  rows: Array<{
    index: number;
    shopName: string;
    orderId: string;
    carrier: string;
    tracking: string;
    status: string;
    itemSummary: string;
    notes: string;
  }>;
};

type PrepareOptions = {
  title: string;
  statusField: "order" | "logistics";
};

function parseArgs(argv: string[]): PrepareOptions {
  let title = "Taobao Shipping Sheet";
  let statusField: "order" | "logistics" = "order";

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--title" && argv[i + 1]) {
      title = argv[i + 1];
      i += 1;
      continue;
    }

    if (arg === "--status-field" && argv[i + 1]) {
      const candidate = argv[i + 1];
      if (candidate === "order" || candidate === "logistics") {
        statusField = candidate;
      }
      i += 1;
    }
  }

  return { title, statusField };
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  const raw = await fs.readFile(taobaoShippingConfig.outputPath, "utf8");
  const collected = JSON.parse(raw) as CollectedPayload;

  const payload: SheetPayload = {
    title: options.title,
    headers: ["店铺名", "订单号", "快递", "快递单号", "签收状态", "商品明细", "备注"],
    rows: collected.rows.map((row, index) => ({
      index: index + 1,
      shopName: row.shopName,
      orderId: row.orderId,
      carrier: row.carrier,
      tracking: row.tracking,
      status:
        options.statusField === "logistics"
          ? row.logisticsStatus || row.orderStatus
          : row.orderStatus || row.logisticsStatus,
      itemSummary: row.itemSummary,
      notes: "",
    })),
  };

  const outputPath = taobaoShippingConfig.sheetPayloadPath;
  await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`Saved sheet payload to ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
