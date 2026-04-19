---
name: taobao-shipping-to-sheet
description: Use this skill when the user wants to extract Taobao bought-items logistics from a specified orders page, including order ids, carriers, tracking numbers, shop names, and purchased item descriptions, and then write the normalized results into a Google Sheet using an existing shipping template or a documented fallback template layout.
---

# Taobao Shipping To Sheet

This skill handles a two-part workflow:

1. Extract logistics and item descriptions from a specified Taobao bought-items page with Playwright.
2. Duplicate a Google Sheets shipping template and write the extracted rows into Drive.

## When to use

Use this skill when the user asks for any of the following:

- scrape or collect Taobao logistics / tracking numbers
- extract one page of bought-items orders
- capture item descriptions alongside logistics
- update a Taobao shipping spreadsheet
- duplicate a shipping template into Google Drive and fill it

## Extraction workflow

Use the bundled Playwright scripts already wired into the repo:

- `npm run taobao:login`
- `npm run taobao:collect -- --page <N>`

Important:

- `taobao:login` opens Chrome and saves Taobao login state into `.local/taobao-shipping/storage-state.json`
- `taobao:collect -- --page <N>` jumps to the requested page, hovers each `查看物流`, and writes structured JSON to `.local/taobao-shipping/logistics-results.json`
- The collector output includes `orderId`, `shopName`, `itemDescriptions`, `itemSummary`, `carrier`, `tracking`, `orderStatus`, and `logisticsStatus`

After collection, read only the JSON output file and avoid asking the user to manually paste Console output unless Playwright is blocked.

## Google Sheet workflow

Prefer the Google Drive plugin and tools for all Drive operations.

### Template selection

1. If the user gives a template URL or exact file name, use that.
2. Otherwise search Drive for likely shipping templates such as:
   - `海运`
   - `taobao summary`
   - `Jihan海运`
3. If a matching template exists, duplicate it.
4. If no template is accessible, create a new Google Sheet and use the fallback column layout from `references/sheet-template.md`.

### Row mapping

Use the extracted JSON rows and map them into the shipping sheet like this:

- Column A: sequential row number starting at `1`
- Column B: `shopName`
- Column C: `orderId`
- Column D: `carrier`
- Column E: `tracking`
- Column F: use `orderStatus` by default; if the user wants logistics-state text instead, use `logisticsStatus`
- Column G: `itemSummary`
- Column H: leave blank unless the user asks for notes

When the template already contains title and header rows, preserve them and start writing data at row `3`.

## Files to read

- For the target sheet layout: `references/sheet-template.md`
- For the collected data: `.local/taobao-shipping/logistics-results.json`

## Output expectations

When the skill completes, provide:

- the Drive URL of the new or updated Google Sheet
- a short summary of how many rows were written
- any rows that were missing carrier or tracking values
