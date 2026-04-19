import path from "node:path";

const rootDir = process.cwd();
const localDir = path.join(rootDir, ".local", "taobao-shipping");

export const taobaoShippingConfig = {
  localDir,
  storageStatePath: path.join(localDir, "storage-state.json"),
  outputPath: path.join(localDir, "logistics-results.json"),
  sheetPayloadPath: path.join(localDir, "sheet-payload.json"),
  ordersUrl:
    "https://buyertrade.taobao.com/trade/itemlist/list_bought_items.htm",
};
