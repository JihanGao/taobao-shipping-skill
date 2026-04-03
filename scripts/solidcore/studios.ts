import { type Page } from "playwright";

function studioAliasVariants(studio: string): string[] {
  const variants = new Set<string>([studio]);

  if (studio.includes("Tyson's")) {
    variants.add(studio.replace("Tyson's", "Tysons"));
  }

  if (studio.includes("Tysons")) {
    variants.add(studio.replace("Tysons", "Tyson's"));
  }

  return [...variants];
}

async function clickFirstVisibleText(page: Page, candidates: string[]): Promise<boolean> {
  for (const candidate of candidates) {
    const locator = page.getByText(candidate, { exact: true }).first();
    if (await locator.count()) {
      await locator.click();
      return true;
    }
  }

  return false;
}

export async function applyStudioFilters(page: Page, targetStudios: string[]): Promise<string[]> {
  if (targetStudios.length === 0) {
    return [];
  }

  const selectedStudios: string[] = [];

  await page.getByRole("button", { name: /home studio/i }).click();
  await page.waitForTimeout(300);

  const viewAllStudios = page.getByText("View All Studios", { exact: true });
  if (await viewAllStudios.count()) {
    await viewAllStudios.click();
    await page.waitForTimeout(500);
  }

  const clearButton = page.getByText("Clear", { exact: true }).first();
  if (await clearButton.count()) {
    await clearButton.click();
    await page.waitForTimeout(200);
  }

  for (const studio of targetStudios) {
    const clicked = await clickFirstVisibleText(page, studioAliasVariants(studio));
    if (clicked) {
      selectedStudios.push(studio);
      await page.waitForTimeout(200);
    }
  }

  const selectButton = page.getByText(/Select \(\d+\)/).first();
  if (await selectButton.count()) {
    await selectButton.click();
    await page.waitForTimeout(1500);
  }

  return selectedStudios;
}
