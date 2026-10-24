import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origin = "http://localhost:3100";
async function account(request: APIRequestContext, suffix: string) {
  expect(
    (
      await request.post("/api/account", {
        headers: { origin },
        data: {
          action: "register",
          email: `recovery-${suffix}@example.com`,
          password: "recovery-test-password-123",
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post("/api/mutate", {
        headers: { origin },
        data: {
          op: "profile",
          payload: {
            name: "Taylor Recovery",
            city: "Petaling Jaya",
            age: "adult",
            interests: ["Study"],
            subjects: [],
            availability: [],
            experience: "Beginner",
            communityTypes: [],
            discoverable: false,
          },
        },
      })
    ).ok(),
  ).toBe(true);
}
async function search(page: Page, query: string) {
  await page
    .getByRole("button", { name: "Search AfterBell", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "Where would you like to go?",
  });
  await dialog
    .getByRole("textbox", { name: "Search AfterBell", exact: true })
    .fill(query);
  const box = await dialog.boundingBox();
  expect(
    Math.abs(box!.x + box!.width / 2 - page.viewportSize()!.width / 2),
  ).toBeLessThan(2);
  return dialog;
}
async function audit(page: Page) {
  await expect
    .poll(() =>
      page.getByRole("main").evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe("1");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test("global search opens selected places and connections, preserving filters and conversations", async ({
  page,
}) => {
  await page.request.post("/api/demo", { headers: { origin } });
  await page.goto("/dashboard");
  const placeSearch = await search(page, "New Vision");
  await placeSearch
    .getByRole("region", { name: "Matching places" })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/place=new-vision-badminton-court/);
  await expect(
    page.getByRole("region", { name: "Your selected place" }),
  ).toContainText("New Vision");
  await page
    .getByRole("combobox", { name: "Filter centres by city" })
    .selectOption("Petaling Jaya");
  await expect(page).toHaveURL(/city=Petaling/);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Search badminton centres" }),
  ).toHaveValue("New Vision Badminton Court");
  await expect(
    page.getByRole("combobox", { name: "Filter centres by city" }),
  ).toHaveValue("Petaling Jaya");
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).toHaveURL(/\/places\?kind=badminton$/);
  await page.goto("/places?kind=study&q=Sandbox");
  await page
    .getByRole("button", { name: "View booking options" })
    .first()
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("link", { name: "Open booking page", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  const friendSearch = await search(page, "Adam");
  await friendSearch
    .getByRole("region", { name: "Matching connections" })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(/chat=demo-adam-friend/);
  await expect(page.getByRole("log")).toContainText("Hey Alex!");
  await page.reload();
  await expect(page.getByRole("log")).toContainText("Hey Alex!");
  await page.goBack();
  await expect(page).toHaveURL(/\/places/);
  await audit(page);
});

test("friend requests appear on Home and notifications, with a reloadable requests tab", async ({
  page,
}) => {
  await page.request.post("/api/demo", { headers: { origin } });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("link", { name: /Respond to 1 friend request/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open notifications" }).click();
  await page
    .getByRole("dialog", { name: "Your updates" })
    .getByRole("link", { name: "Review requests" })
    .click();
  await expect(page).toHaveURL(/view=requests/);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Friend requests", exact: true }),
  ).toBeVisible();
  await page
    .locator(".friend-request", { hasText: "Hana" })
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await expect(page.locator(".friend-requests")).toContainText(
    "New friend requests will appear here.",
  );
  await page.goto("/dashboard");
  await expect(
    page.getByRole("link", { name: /Respond to .* friend request/ }),
  ).toHaveCount(0);
  await page.goto("/schools");
  await page
    .getByRole("textbox", { name: "Search school communities" })
    .fill("Meranti");
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Search school communities" }),
  ).toHaveValue("Meranti");
  await expect(page.locator(".school-card")).toHaveCount(1);
  await audit(page);
});

test("account failures offer retry, retain cached data and clear it after session expiry", async ({
  page,
}, info) => {
  await account(page.request, `${Date.now()}-${info.project.name}`);
  let mode: "offline" | "online" | "expired" = "offline";
  await page.route("**/api/state", async (route) => {
    if (mode === "online") return route.continue();
    await route.fulfill({
      status: mode === "expired" ? 401 : 503,
      contentType: "application/json",
      body: JSON.stringify({
        error:
          mode === "expired"
            ? "Sign in required."
            : "Please try again shortly.",
      }),
    });
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: "Your account couldn’t load." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toHaveCount(0);
  await audit(page);
  mode = "online";
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: /Good to see you, Taylor/ }),
  ).toBeVisible();
  mode = "offline";
  const nav = page.getByRole("navigation", {
    name:
      info.project.name === "mobile" ? "Quick navigation" : "Main navigation",
    exact: true,
  });
  await nav.getByRole("link", { name: "Explore", exact: true }).click();
  await expect(
    page.getByText("Updates are paused.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".account-strip")).toContainText("Taylor Recovery");
  await audit(page);
  mode = "expired";
  await page
    .getByRole("button", { name: "Retry updates", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Sign in to continue." }),
  ).toBeVisible();
  await expect(page.locator(".account-strip")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sign in again" })).toBeVisible();
  await audit(page);
});

test("a slow older account response cannot overwrite a newly saved profile", async ({
  page,
}, info) => {
  await account(page.request, `race-${Date.now()}-${info.project.name}`);
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Good to see you, Taylor/ }),
  ).toBeVisible();
  let release!: () => void;
  let captured!: () => void;
  const oldRead = new Promise<void>((resolve) => {
    captured = resolve;
  });
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    "**/api/state",
    async (route) => {
      const old = await route.fetch();
      captured();
      await gate;
      await route.fulfill({ response: old });
    },
    { times: 1 },
  );
  const nav = page.getByRole("navigation", {
    name:
      info.project.name === "mobile" ? "Quick navigation" : "Main navigation",
    exact: true,
  });
  await nav.getByRole("link", { name: "Explore", exact: true }).click();
  await oldRead;
  const dialog = await search(page, "profile");
  await dialog.getByRole("link", { name: /Your profile/ }).click();
  await page.getByLabel("What should we call you?").fill("Taylor Updated");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(
    page.getByRole("heading", { name: /Good to see you, Taylor/ }),
  ).toBeVisible();
  await expect(page.locator(".account-strip")).toContainText("Taylor Updated");
  const response = page.waitForResponse(
    (r) => r.url().endsWith("/api/state") && r.request().method() === "GET",
  );
  release();
  await response;
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(page.locator(".account-strip")).toContainText("Taylor Updated");
  const state = await (await page.request.get("/api/state")).json();
  expect(state.profile.name).toBe("Taylor Updated");
});
