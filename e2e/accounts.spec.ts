import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("individual account signup, onboarding, drafts, logout, login and recovery", async ({
  page,
}, info) => {
  test.setTimeout(90000);
  const email = `browser-${info.project.name}-${Date.now()}@example.com`,
    password = "a-good-test-password-123";
  await page.goto("/auth?mode=register");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password").fill(password);
  await page
    .getByRole("button", { name: "Create your account", exact: true })
    .click();
  const keyPanel = page.getByRole("region", { name: "Save your recovery key" });
  await expect(keyPanel).toBeVisible();
  const recoveryKey = (await keyPanel.locator("code").innerText()).trim();
  await page.getByRole("button", { name: /I’ve saved my key/ }).click();
  await page.getByLabel("What should we call you?").fill("Morgan Browser");
  await page.getByRole("button", { name: "Keep going" }).click();
  await page.getByRole("button", { name: "Study", exact: true }).click();
  await page.getByRole("button", { name: "Keep going" }).click();
  await page
    .getByRole("button", { name: "Find your people", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you, Morgan/ }),
  ).toBeVisible();
  await expect(page.getByText("Demo Data", { exact: true })).toHaveCount(0);
  const initial = await (await page.request.get("/api/state")).json();
  expect(initial.profile.name).toBe("Morgan Browser");
  expect(
    initial.sparks.some((s: { id: string }) => s.id === "saturday-doubles"),
  ).toBe(false);
  await page.goto("/sparks/create");
  await page.getByLabel("Give it a name").fill("My own revision afternoon");
  await page.getByLabel("Your kind of thing").selectOption("study");
  await page
    .getByLabel("Tell people a little more")
    .fill(
      "A quiet study circle to work through this week’s maths questions together.",
    );
  await page.getByLabel("Academic level").selectOption("IGCSE");
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.getByRole("link", { name: /Continue a draft/ }).click();
  await page
    .locator(".plans-results .plan-row", {
      hasText: "My own revision afternoon",
    })
    .click();
  await page
    .getByRole("button", { name: "Publish Spark", exact: true })
    .click();
  await expect(page.getByText("DRAFT", { exact: true })).toHaveCount(0);
  await expect(page.getByText("IGCSE", { exact: false }).first()).toBeVisible();
  const state = await (await page.request.get("/api/state")).json();
  expect(
    state.sparks.find(
      (s: { title: string }) => s.title === "My own revision afternoon",
    ).status,
  ).toBe("BLOCKED");
  const cookies = await page.context().cookies();
  expect(cookies.find((c) => c.name === "afterbell-session")?.httpOnly).toBe(
    true,
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/auth/);
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .locator("form")
    .getByRole("button", { name: "Log in", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: /Good to see you, Morgan/ }),
  ).toBeVisible();
  expect((await (await page.request.get("/api/state")).json()).profile.id).toBe(
    initial.profile.id,
  );
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/auth");
  await page.getByRole("button", { name: "Forgot your password?" }).click();
  await page.getByLabel("Email address").fill(email);
  await page
    .getByLabel("Password", { exact: true })
    .fill("my-new-password-456");
  await page.getByLabel("Recovery key", { exact: true }).fill(recoveryKey);
  await page
    .getByRole("button", { name: "Reset password", exact: true })
    .click();
  await expect(keyPanel).toBeVisible();
  expect((await keyPanel.locator("code").innerText()).trim()).not.toBe(
    recoveryKey,
  );
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("schools have distinct workspaces, member privacy and preselected activities", async ({
  page,
}, info) => {
  await page.request.post("/api/demo", {
    headers: { origin: "http://localhost:3100" },
  });
  await page.goto("/hubs");
  await page.getByRole("button", { name: "My schools", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Meranti Learning Collective" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Selasih School Community" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Bayu School Community" }),
  ).toHaveCount(0);
  await page.goto("/hubs/selasih-school");
  await page.getByRole("button", { name: "Members", exact: true }).click();
  await expect(page.getByText("Private member", { exact: true })).toHaveCount(
    2,
  );
  await expect(
    page.getByRole("button", { name: "Create invitation code" }),
  ).toHaveCount(0);
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
  await page.getByLabel("Switch community").selectOption("school-hub");
  await expect(
    page.getByRole("heading", {
      name: "Meranti Learning Collective",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Members", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Create invitation code" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Activities", exact: true }).click();
  await page.getByRole("link", { name: "Start a Spark", exact: true }).click();
  await expect(page.getByLabel("Where should this Spark live?")).toHaveValue(
    "school-hub",
  );
  await expect(page.getByLabel("City or district")).toHaveValue("Kuala Lumpur");
});
