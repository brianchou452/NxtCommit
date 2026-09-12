import { test, expect } from "@playwright/test";
test("Imported catalog connects discovery, bilingual scope, real repo, pledge and persistent commitment", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.request.post("/api/demo/reset");
  await page.goto("/");
  const cards = page.locator('[data-mission-id="catalog-mermaid"]');
  await expect(cards.first()).toBeVisible();
  await cards.first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/missions\/catalog-mermaid$/);
  await expect(page.locator(".mission-project a")).toHaveAttribute(
    "href",
    "https://github.com/mermaid-js/mermaid",
  );
  await expect(page.getByTestId("catalog-content")).toContainText(
    "Make dense flowcharts stay legible",
  );
  await expect(page.getByTestId("mission-actions")).toContainText("4310");
  await page.screenshot({
    path: testInfo.outputPath("catalog-mermaid-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Pledge compute credits", exact: true })
    .click();
  await page.getByRole("spinbutton").fill("10");
  await page
    .getByRole("button", { name: "Commit credits", exact: true })
    .click();
  await expect(page.getByTestId("mission-actions")).toContainText("4320");
  await page.getByRole("link", { name: "My Commitment", exact: true }).click();
  await expect(
    page.locator(".mc-receipt").filter({ hasText: "Mermaid" }),
  ).toContainText("10 pledged");
  await page.goto("/missions/catalog-ky");
  await expect(page.getByTestId("catalog-content")).toContainText(
    "Authored activity history",
  );
  const history = page.getByText("Authored activity history", { exact: false });
  await history.focus();
  await page.keyboard.press("Enter");
  await expect(history.locator("..")).toHaveAttribute("open", "");
  await expect(page.getByTestId("catalog-content")).toContainText(
    "Repository analyzed",
  );
  await page.goto("/missions/catalog-localsend");
  await page
    .getByRole("combobox", { name: "Language", exact: true })
    .selectOption("zh-TW");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("catalog-content")).toContainText("募資範圍");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath("catalog-localsend-mobile.png"),
    fullPage: true,
  });
  await page.request.post("/api/demo/reset");
});
