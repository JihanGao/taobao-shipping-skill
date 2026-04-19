# Taobao Shipping Skill

A standalone Codex-friendly repo for extracting Taobao bought-items logistics and preparing Google Sheets payloads for shipping tracking.

## What this repo does

1. Open Taobao bought-items, jump to a specified page, and extract:
- order id
- shop name
- purchased item descriptions
- carrier
- tracking number
- order status
- logistics status

2. Convert the extracted JSON into a Google Sheet-ready payload that matches the existing sea-shipping template layout.

## Install

```bash
npm install
```

## Commands

Save Taobao login state:

```bash
npm run taobao:login
```

Collect one bought-items page:

```bash
npm run taobao:collect -- --page 1
```

Prepare a sheet payload from the collected JSON:

```bash
npm run taobao:prepare-sheet -- --title "Jihan Gao 4月中海运"
```

## Output files

Artifacts are written to:

- `.local/taobao-shipping/storage-state.json`
- `.local/taobao-shipping/logistics-results.json`
- `.local/taobao-shipping/sheet-payload.json`

## Skill entrypoint

The Codex skill definition lives at:

- `skills/taobao-shipping-to-sheet/SKILL.md`

Use it when you want Codex to:

- scrape Taobao logistics from a specified page
- collect purchased item descriptions with tracking data
- prepare rows for a shipping spreadsheet
- duplicate and fill a Google Sheet template in Drive
