import { test, expect } from "@playwright/test";
const origin = "http://127.0.0.1:4179";
// All captures use persistence.home-demo-seed, en, Asia/Taipei, frozen motion,
// and the pinned Docker Chromium. Existing approved PNGs are never overwritten.
test.beforeEach(async ({ page }) => {
  await page.goto(origin + "/__fixture/ready");
  await expect(page.locator(".beacon")).toHaveCount(20);
});
const pages = [
  ["home-desktop-ready", "/", 1440, 1200, "#mvp"],
  [
    "marketplace-desktop-ready",
    "/marketplace",
    1440,
    1000,
    "#projects .category",
  ],
  [
    "contributor-profile-seeded",
    "/contributors/demo-contributor",
    1440,
    1200,
    '[data-testid="contributor-impact"]',
  ],
  ["guided-demo-ready", "/demo", 1440, 900, ".demo-choices"],
  [
    "route-not-found",
    "/does-not-exist",
    1440,
    900,
    '[data-testid="route-recovery"]',
  ],
] as const;
// Specs: visual.home, visual.marketplace, visual.contributor-profile, visual.guided-demo, visual.route-fallbacks.
for (const [id, path, width, height, selector] of pages)
  test(id, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.goto(origin + path);
    await expect(page.locator(selector).first()).toBeVisible();
    if (path === "/" || path === "/marketplace") {
      await expect(page.locator("#projects .campaign").first()).toBeVisible();
      for (const section of await page.locator("main > section").all())
        await section.scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.screenshot({
      path: info.outputPath(id + "-current.png"),
      fullPage: true,
      animations: "disabled",
    });
    await expect(page).toHaveScreenshot(id + ".png", {
      fullPage: true,
      animations: "disabled",
    });
  });
const components = [
  [
    "application-shell-desktop",
    "/demo",
    '[data-testid="shell-header"]',
    "component-application-shell-desktop",
  ],
  [
    "campaign-browser-ready",
    "/marketplace",
    '[data-testid="category"]',
    "component-campaign-browser-ready",
  ],
  [
    "campaign-card-featured-funding",
    "/marketplace",
    ".campaign.featured",
    "component-campaign-card-featured-funding",
  ],
  [
    "contributor-impact-seeded",
    "/contributors/demo-contributor",
    '[data-testid="contributor-impact"]',
    "component-contributor-impact-seeded",
  ],
  [
    "comment-wall-ready",
    "/missions/mermaid",
    '[data-testid="comment-wall"]',
    "component-comment-wall-ready",
  ],
  [
    "route-recovery-not-found",
    "/does-not-exist",
    '[data-testid="route-recovery"]',
    "component-route-recovery-not-found",
  ],
] as const;
// Specs: visual.application-shell, visual.campaign-browser, visual.campaign-card,
// visual.contributor-impact, visual.comment-wall, visual.route-recovery.
for (const [id, path, selector, golden] of components)
  test(id, async ({ page }, info) => {
    await page.setViewportSize({
      width: 1440,
      height:
        id === "application-shell-desktop"
          ? 900
          : id.includes("contributor") || id.includes("wall")
            ? 1200
            : 1000,
    });
    await page.goto(origin + path);
    await expect(
      page.getByLabel("Compute credits", { exact: true }),
    ).toHaveText("10,000");
    const subject = page.locator(selector).first();
    await expect(subject).toBeVisible();
    if (id === "comment-wall-ready")
      await expect(subject).toContainText("No notes yet. Be the first.");
    await subject.screenshot({
      path: info.outputPath(id + "-current.png"),
      animations: "disabled",
    });
    await expect(subject).toHaveScreenshot(golden + ".png", {
      animations: "disabled",
    });
  });
// Spec: visual.guided-demo-controller; baseline: guided-demo-provider-active.
test("guided-demo-provider-active", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + "/demo");
  await page
    .getByRole("button", { name: "Start provider walkthrough" })
    .click();
  await expect(page.locator('[data-guide-target="campaign"]')).toBeInViewport();
  const guide = page.getByTestId("guide");
  await expect(guide).toContainText(
    "Use the highlighted product control to continue.",
  );
  await guide.screenshot({
    path: info.outputPath("guided-demo-provider-active-current.png"),
  });
  await expect(guide).toHaveScreenshot(
    "component-guided-demo-provider-active.png",
  );
});
// Spec: visual.guided-demo-controller; baseline: guided-demo-maintainer-active.
// C must supply the real analysis target. This gate intentionally fails instead of
// capturing the recovery panel as a successful maintainer walkthrough.
test("guided-demo-maintainer-active", async ({ page }, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(origin + "/demo");
  await page
    .getByRole("button", { name: "Start maintainer walkthrough" })
    .click();
  await expect(page).toHaveURL(/\/new\?demo=maintainer$/);
  await expect(page.getByTestId("guide")).toContainText(
    "Use the highlighted product control to continue.",
  );
  await page.screenshot({
    path: info.outputPath("maintainer-missing-target.png"),
    fullPage: true,
  });
  await expect(page.locator('[data-guide-target="analyze"]')).toBeVisible();
  await expect(page.getByTestId("guide")).toHaveScreenshot(
    "component-guided-demo-maintainer-active.png",
  );
});
