import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.request.post("/api/demo", {
    headers: { origin: "http://localhost:3100" },
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Good to see you, Alex/ }),
  ).toBeVisible();
});

test("my plans shows every plan, finds bookmarks and preserves the selected folder", async ({
  page,
}, info) => {
  const nav = page.getByRole("navigation", {
    name:
      info.project.name === "mobile" ? "Quick navigation" : "Main navigation",
    exact: true,
  });
  await nav.getByRole("link", { name: "My plans", exact: true }).click();
  await expect(page).toHaveURL(/\/plans$/);
  await expect(page.locator(".plans-results .plan-row")).toHaveCount(5);
  await page
    .getByRole("textbox", { name: "Search your plans" })
    .fill("Saturday doubles");
  await expect(page.locator(".plans-results .plan-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Clear plan search" }).click();
  await expect(page.locator(".plans-results .plan-row")).toHaveCount(5);
  await page
    .getByRole("navigation", { name: "Plan folders" })
    .getByRole("link", { name: /Drafts/ })
    .click();
  await expect(page).toHaveURL(/view=drafts/);
  await expect(page.locator(".plans-results .plan-row")).toHaveCount(1);
  await page.locator(".plans-results .plan-row").click();
  await expect(page).toHaveURL(/\/edit$/);
  await expect(page.getByLabel("Give it a name")).not.toBeEmpty();

  await page.goto("/explore");
  await page
    .getByRole("button", {
      name: "Save One more for Saturday doubles?",
      exact: true,
    })
    .click();
  await page.goto("/plans?view=saved");
  await expect(page.locator(".plans-results .plan-row")).toHaveCount(1);
  await expect(page.locator(".plans-results .plan-row")).toContainText(
    "One more for Saturday doubles?",
  );
  await page.reload();
  await expect(
    page
      .getByRole("navigation", { name: "Plan folders" })
      .getByRole("link", { name: /Saved/ }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".plans-results .plan-row")).toHaveCount(1);
});

test("search finds a community, breadcrumbs lead back, and dialogs close with Escape", async ({
  page,
}, info) => {
  const trigger = page.getByRole("button", {
    name: "Search AfterBell",
    exact: true,
  });
  await trigger.click();
  const dialog = page.getByRole("dialog", {
    name: "Where would you like to go?",
  });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: "Search AfterBell", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await page.keyboard.press("Control+k");
  await dialog
    .getByRole("textbox", { name: "Search AfterBell", exact: true })
    .fill("Meranti");
  await dialog
    .getByRole("link", { name: /Meranti Learning Collective/ })
    .click();
  await expect(page).toHaveURL(/\/hubs\/school-hub/);
  const breadcrumbs = page.getByRole("navigation", {
    name: "Breadcrumb",
    exact: true,
  });
  await expect(breadcrumbs).toContainText("Meranti Learning Collective");
  await breadcrumbs
    .getByRole("link", { name: "Communities", exact: true })
    .click();
  await expect(page).toHaveURL(/\/hubs$/);
  if (info.project.name === "mobile") {
    const nav = page.getByRole("navigation", {
      name: "Quick navigation",
      exact: true,
    });
    await expect(
      nav.getByRole("link", { name: "Communities", exact: true }),
    ).toHaveAttribute("aria-current", "page");
    await nav.getByRole("link", { name: "Create", exact: true }).click();
    await expect(nav.locator('[aria-current="page"]')).toHaveCount(1);
    const menu = page.getByRole("button", { name: "Open menu", exact: true });
    await menu.click();
    await expect(
      page.getByRole("dialog", { name: "Your space", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveAttribute("aria-expanded", "false");
    await expect(menu).toBeFocused();
    await nav.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  }
  await page.goto("/");
  await page.getByRole("link", { name: "Go to Home", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
