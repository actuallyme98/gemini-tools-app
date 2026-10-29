import { expect, type Locator, type Page } from "@playwright/test";
export async function chooseOption(
  page: Page,
  control: Locator,
  value: string | { label: string },
) {
  await expect(control).toBeEnabled();
  await control.click();
  if (typeof value === "string")
    await page
      .locator('[role="option"]')
      .filter({ visible: true })
      .and(page.locator(`[data-value="${value}"]`))
      .click();
  else
    await page.getByRole("option", { name: value.label, exact: true }).click();
}
