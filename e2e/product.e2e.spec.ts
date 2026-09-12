import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
const fixture = (page: Page, name = "ready") =>
  page.goto(`http://127.0.0.1:4179/__fixture/${name}`);
const evidence = async (page: Page) =>
  (await page.request.get("http://127.0.0.1:4179/__evidence")).json();
// Spec: page.home; Scenario: impact-first-journey-preserves-section-anchors.
// Spec: component.hero; Scenario: hero-links-the-story-to-real-payloads.
// Spec: component.commitment-flow; Scenario: flow-explains-the-four-human-accountable-stages.
// Spec: component.campaign-browser; Scenario: embedded-browser-groups-deduplicated-campaigns-without-a-second-h1.
// Spec: component.campaign-card; Scenario: campaign-card-preserves-data-and-action-boundaries.
// Spec: component.release-update; Scenario: release-update-links-only-a-real-local-release-and-keeps-provenance.
test("Home discovery, map pinning, categories, release link and repeated navigation use loaded data", async ({
  page,
}) => {
  await fixture(page);
  await expect(
    page.locator('#projects [data-testid="campaign-card"]'),
  ).toHaveCount(16);
  await expect(page.locator("h1")).toHaveCount(1);
  expect(
    await page
      .locator("main > section")
      .evaluateAll((nodes) => nodes.map((n) => n.id)),
  ).toEqual(["hero", "how", "map", "projects", "mvp"]);
  await expect(page.locator("#how li")).toHaveCount(4);
  await expect(page.locator("#how")).toContainText(
    "Maintainers review and decide.",
  );
  const stats = (await evidence(page)).impact.stats;
  await expect(page.locator("#hero")).toContainText(
    String(stats.projectsRevived),
  );
  await page.getByRole("link", { name: "Explore Campaigns" }).click();
  await expect(page).toHaveURL(/#projects$/);
  await expect(page.locator("#projects")).toBeInViewport();
  const cards = await page
    .locator("#projects [data-mission-id]")
    .evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute("data-mission-id")),
    );
  expect(new Set(cards).size).toBe(cards.length);
  await page.locator("#map select").selectOption("demo-contributor");
  await expect(page.locator(".map-detail")).toContainText("Taipei");
  await expect(page.locator(".map-detail")).toContainText("demo-contributor");
  await page
    .getByRole("button", { name: "Taipei, Taiwan", exact: true })
    .click();
  await expect(page.locator("#map select")).toHaveValue("");
  await page.locator("#mvp").getByRole("link").click();
  await expect(page).toHaveURL(/\/missions\/marked$/);
  await expect(
    page.getByRole("heading", { name: "Wall", exact: true }),
  ).toBeVisible();
  await page.getByTestId("shell-header").getByRole("link", { name: "Discover", exact: true }).click();
  await page.locator("#projects .campaign").first().getByRole("link").click();
  await expect(page).toHaveURL(/\/missions\/mermaid$/);
  await page.getByTestId("shell-header").getByRole("link", { name: "Discover", exact: true }).click();
  await page.locator("#map select").selectOption("backer-4");
  await expect(page.locator(".map-detail")).toContainText("Tokyo");
});
// Spec: component.donor-world-map; Scenario: map-renders-shared-demo-snapshot-with-honest-fallbacks.
test("Home initial failure preserves unknown values and retry recovers; empty map stays empty", async ({
  page,
}) => {
  await fixture(page, "home-error");
  await expect(page.locator('#map [role="alert"]')).toBeVisible();
  await expect(page.locator("#hero .signals")).toContainText("—");
  await page
    .locator("#map")
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(page.locator("#map select")).toBeVisible();
  await page.locator("#map select").selectOption("demo-contributor");
  await expect(page.locator(".map-detail")).toContainText("Taipei");
  await fixture(page, "empty-map");
  await expect(
    page.getByText("No demo backer locations are available yet."),
  ).toBeVisible();
  await expect(page.locator(".beacon")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await expect(page.locator(".beacon")).toHaveCount(20);
});
// Spec: page.marketplace; Scenario: marketplace-route-composes-live-read-model.
test("Marketplace retries, expands real overflow and distinguishes empty state", async ({
  page,
}) => {
  await fixture(page, "market-error");
  await expect(page.locator('#projects [role="alert"]')).toBeVisible();
  await page
    .locator("#projects")
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(page.getByTestId("category").first()).toBeVisible();
  await page.getByTestId("category").first().locator("summary").click();
  await expect(
    page.getByTestId("category").first().locator("details"),
  ).toHaveAttribute("open", "");
  await page
    .getByTestId("category")
    .first()
    .locator("details .campaign")
    .first()
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/\/missions\//);
  await fixture(page, "empty-market");
  await expect(page.getByText("No campaigns are available yet.")).toBeVisible();
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await expect(page.locator("#projects .campaign")).toHaveCount(16);
});
// Spec: component.comment-wall; Scenario: wall-trusts-server-thread.
// Spec: api.wall-post; Scenario: wall-post-redacts-before-storage.
// Spec: api.mvp-vote; Scenario: one-local-vote-per-category.
test("Wall failure preserves draft; persisted redaction, vote lock and reset are UI-driven", async ({
  page,
}) => {
  await fixture(page, "wall-error");
  const body = "Review synthetic " + "sk-" + "testonly".repeat(4);
  await page.getByLabel("Leave a local note").fill(body);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(
    page.getByTestId("comment-wall").getByRole("alert"),
  ).toBeVisible();
  await expect(page.getByLabel("Leave a local note")).toHaveValue(body);
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByTestId("comment-wall")).toContainText("[REDACTED]");
  await expect(page.getByLabel("Leave a local note")).toHaveValue("");
  await page.getByRole("button", { name: "Vote", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: "Category vote recorded" }),
  ).toHaveCount(3);
  await expect(
    page.getByRole("button", { name: "Category vote recorded" }).first(),
  ).toBeDisabled();
  await page.reload();
  await expect(page.getByTestId("comment-wall")).toContainText("[REDACTED]");
  await expect(
    page.getByRole("button", { name: "Category vote recorded" }).first(),
  ).toBeDisabled();
  const persisted = await evidence(page);
  expect(persisted.wall).toHaveLength(1);
  expect(persisted.wall[0].body).not.toContain("testonly");
  expect(persisted.wall[0].authorRole).toBe("contributor");
  expect(
    persisted.nominees.reduce(
      (n: number, r: { votes: number }) => n + r.votes,
      0,
    ),
  ).toBe(1);
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await expect(page).toHaveURL("http://127.0.0.1:4179/");
  await page.locator("#projects .campaign").first().getByRole("link").click();
  await expect(page.getByText("No notes yet. Be the first.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Vote", exact: true }),
  ).toHaveCount(3);
});
// Spec: page.contributor-profile; Scenario: profile-keeps-demo-identity-visible.
// Spec: component.contributor-impact; Scenario: impact-record-is-locally-traceable.
test("Profile accounting links persisted pledge records and handles missing and empty profiles", async ({
  page,
}) => {
  await fixture(page);
  await page.getByRole("link", { name: "My Commitment", exact: true }).click();
  await expect(page.getByTestId("contributor-impact")).toContainText(
    "Local demo persona and prototype credits.",
  );
  await expect(page.getByRole("heading", { name: "Ship It" })).toBeVisible();
  await page.locator(".mc-receipt > a").filter({ hasText: "marked" }).click();
  await expect(page).toHaveURL(/\/missions\/marked$/);
  await page.goto("http://127.0.0.1:4179/contributors/missing");
  await expect(
    page.getByRole("heading", { name: "This page could not be found." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to Discover" }).click();
  await expect(page.locator("#hero")).toBeVisible();
  await fixture(page, "empty-profile");
  await expect(page.getByText("No local records yet.")).toHaveCount(3);
  await page
    .getByRole("button", { name: "Reset demo data", exact: true })
    .click();
  await expect(page).toHaveURL("http://127.0.0.1:4179/");
  await page.getByRole("link", { name: "My Commitment", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Ship It" })).toBeVisible();
});
// Spec: page.guided-demo; Scenario: guided-demo-resets-before-navigation.
// Given Visitor selects a walkthrough on the Demo route.
// When The launcher succeeds.
// Then A real reset completes before navigation and the destination guide points at a visible product control.
// Spec: component.guided-demo-controller; Scenario: controller-waits-for-real-reset.
test("Guide waits for reset, recovers failure, targets a real campaign and never performs its mutation", async ({
  page,
}) => {
  await fixture(page, "reset-error");
  await page
    .getByRole("button", { name: "Start provider walkthrough" })
    .click();
  await expect(
    page.getByRole("button", { name: "Start provider walkthrough" }),
  ).toBeDisabled();
  await expect(page.getByRole("alert")).toContainText(
    "Demo data could not be reset.",
  );
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByTestId("guide")).toHaveCount(0);
  const reset = page.waitForResponse(
    (r) => r.url().endsWith("/api/demo/reset") && r.status() === 200,
  );
  await page
    .getByRole("button", { name: "Start provider walkthrough" })
    .click();
  await reset;
  await expect(page).toHaveURL(/\/marketplace\?demo=provider$/);
  await expect(page.getByTestId("guide")).toContainText(
    "Use the highlighted product control to continue.",
  );
  await expect(page.locator('[data-guide-target="campaign"]')).toBeInViewport();
  expect((await evidence(page)).wall).toHaveLength(0);
  await page.locator('[data-guide-target="campaign"]').click();
  await expect(page).toHaveURL(/\/missions\/mermaid\?demo=provider$/);
  await expect(page.getByTestId("guide")).toContainText(
    "The next product control is not available in this slice.",
  );
  await page.getByRole("button", { name: "Exit walkthrough" }).click();
  await expect(page.getByTestId("guide")).toHaveCount(0);
  await expect(page).toHaveURL(/\/missions\/mermaid$/);
});
test("Maintainer guide targets the integrated analysis control and can exit", async ({ page }) => {
  await fixture(page);
  await page.getByRole("link", { name: "Demo", exact: true }).click();
  await page.getByRole("button", { name: "Start maintainer walkthrough" }).click();
  await expect(page).toHaveURL(/\/new\?demo=maintainer$/);
  await expect(page.locator('[data-guide-target="analyze"]')).toBeVisible();
  await expect(page.getByTestId("guide")).toContainText("Use the highlighted product control to continue.");
  await page.getByRole("button", { name: "Exit walkthrough" }).click();
  await expect(page.getByTestId("guide")).toHaveCount(0);
  await expect(page).toHaveURL(/\/new$/);
});
// Spec: api.global-stream; Scenario: global-stream-revalidates-after-mission-update-and-reconnect.
for (const mode of ["stream", "reconnect"])
  test(`Home and marketplace revalidate persisted snapshots after ${mode}`, async ({
    page,
    context,
  }) => {
    await fixture(page, mode);
    await expect(page.locator(".beacon")).toHaveCount(20);
    const before = await evidence(page);
    const second = await context.newPage();
    await second.goto("http://127.0.0.1:4179/demo");
    await second
      .getByRole("button", { name: "Reset demo data", exact: true })
      .click();
    await expect(second).toHaveURL("http://127.0.0.1:4179/");
    const after = await evidence(page);
    expect(after.impact.stats.tokensDonated).not.toBe(
      before.impact.stats.tokensDonated,
    );
    await expect(page.locator("#hero .signals dd").first()).toHaveText(
      (after.impact.stats.tokensDonated / 1000).toLocaleString("en"),
    );
    expect((await evidence(page)).impactRequests).toBeGreaterThan(
      before.impactRequests,
    );
    await second.close();
  });
// Spec: page.route-fallbacks; Scenario: route-fallbacks-remain-recoverable.
// Spec: component.route-recovery; Scenario: recovery-does-not-leak-internals.
test("Unknown route recovers through Home and language preference survives repeat navigation", async ({
  page,
}) => {
  await fixture(page);
  await page.goto("http://127.0.0.1:4179/does-not-exist");
  await expect(
    page.getByRole("heading", { name: "This page could not be found." }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Back to Discover" }).click();
  await expect(page.locator("#hero")).toBeVisible();
  await page.getByLabel("Language", { exact: true }).selectOption("zh-TW");
  await expect(page.locator("#hero")).toContainText("探索募資提案");
  await page.getByRole("link", { name: "Demo", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "啟動提供者導覽" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "zh-TW");
  await page.getByTestId("shell-header").getByRole("link", { name: "Discover", exact: true }).click();
  await expect(page.locator("#hero")).toContainText("探索募資提案");
});
test("Loading remains unknown; heartbeat never changes or refetches snapshots", async ({
  page,
}) => {
  await fixture(page, "slow");
  await expect(page.locator("#hero .signals dd").first()).toHaveText("—");
  await expect(page.locator('#map [role="status"]')).toBeVisible();
  await expect(page.locator("#projects .skeletons")).toBeVisible();
  await page.getByRole("link", { name: "Explore Campaigns" }).click();
  await expect(page.locator("#projects .campaign")).toHaveCount(16);
  await fixture(page, "heartbeat");
  await expect(page.locator(".beacon")).toHaveCount(20);
  const before = await evidence(page);
  await expect
    .poll(async () => (await evidence(page)).heartbeats)
    .toBeGreaterThan(before.heartbeats + 3);
  const after = await evidence(page);
  expect(after.impactRequests).toBe(before.impactRequests);
  expect(after.marketRequests).toBe(before.marketRequests);
});
test("Profile network retry and render-error reload restore a readable route without internals", async ({
  page,
}) => {
  await fixture(page, "profile-error");
  await expect(page.locator('main [role="alert"]')).toBeVisible();
  await page
    .locator("main")
    .getByRole("button", { name: "Retry", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Ship It" })).toBeVisible();
  await fixture(page, "render-error");
  await expect(
    page.getByRole("heading", { name: "This page could not be loaded." }),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("TypeError");
  await page.getByRole("button", { name: "Reload page" }).click();
  await expect(page.getByRole("heading", { name: "Ship It" })).toBeVisible();
});
test("Mobile discovery keeps controls usable and does not overflow the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await fixture(page);
  await expect(page.locator("#projects .campaign")).toHaveCount(16);
  await page.getByRole("link", { name: "Explore Campaigns" }).click();
  await page.locator("#projects .campaign").first().getByRole("link").click();
  await page.getByLabel("Leave a local note").fill("Mobile note");
  await page.getByRole("button", { name: "Post", exact: true }).click();
  await expect(page.getByTestId("comment-wall")).toContainText("Mobile note");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

// Spec: component.contributor-impact; Scenario: impact-record-is-locally-traceable.
test("My Commitment port retains the badge shelf, receipt chain, locale and mobile reflow", async ({ page }, testInfo) => {
  await fixture(page);
  await page.getByRole('link', {name:'My Commitment',exact:true}).click();
  await expect(page.locator('.mc-shelf > li')).toHaveCount(13);
  await expect(page.locator('.mc-stats > div')).toHaveCount(5);
  await expect(page.locator('.mc-shelf .is-locked').first()).toBeVisible();
  await expect(page.locator('.mc-receipt').first()).toContainText('pledged');
  await expect(page.locator('.mc-table-wrap tbody tr')).toHaveCount(2);
  await page.screenshot({path:testInfo.outputPath('commitment-desktop.png'),fullPage:true});
  await page.getByRole('combobox',{name:'Language',exact:true}).selectOption('zh-TW');
  await expect(page.locator('#mc-badges')).toHaveText('徽章');
  await expect(page.locator('#mc-pledges')).toBeVisible();
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.mc-shelf > li')).toHaveCount(13);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('commitment-mobile-zh.png'),fullPage:true});
  await page.locator('.mc-receipt > a').first().focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/missions\//);
});
