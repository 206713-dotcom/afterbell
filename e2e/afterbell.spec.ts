import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import AxeBuilder from "@axe-core/playwright";
async function demo(page: Page) {
  await page.request.post("/api/demo", {
    headers: { origin: "http://localhost:3100" },
  });
  await page.goto("/dashboard");
  await expect(
    page.getByRole("heading", { name: /Good to see you, Alex/ }),
  ).toBeVisible();
}
test("homepage, auth, demo entry, and responsive layout", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Find your people.",
  );
  await page.getByRole("button", { name: /Try the live demo/ }).click();
  await expect(page).toHaveURL(/dashboard/);
  await expect(
    page.getByText("Demo Data", { exact: true }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Good to see you/ }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  fs.mkdirSync(".local/screenshots", { recursive: true });
  await expect(
    page.getByRole("heading", { name: "Your next steps", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `.local/screenshots/dashboard-${info.project.name}.png`,
    fullPage: true,
  });
  expect(errors).toEqual([]);
});
test("Spark CRUD persists across reloads and discovery filters work", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/sparks/create");
  await page.getByLabel("Give it a name").fill("A little test study circle");
  await page
    .getByLabel("Tell people a little more")
    .fill(
      "A welcoming study session to share ideas and work through some maths together.",
    );
  await page.getByLabel("Your kind of thing").selectOption("study");
  await page.getByRole("button", { name: "Put your Spark out there" }).click();
  await expect(page).toHaveURL(/explore/);
  await page
    .getByLabel("Search activity title, description or subject")
    .fill("A little test study");
  await expect(
    page.getByRole("link", { name: "A little test study circle", exact: true }),
  ).toBeVisible();
  await page.reload();
  await page
    .getByLabel("Search activity title, description or subject")
    .fill("A little test study");
  await page
    .getByRole("link", { name: "A little test study circle", exact: true })
    .click();
  await page.getByRole("link", { name: "Edit Spark" }).click();
  await page
    .getByLabel("Give it a name")
    .fill("An updated little study circle");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(
    page.getByRole("heading", { name: "An updated little study circle" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Delete Spark", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete Spark" })
    .click();
  await expect(page).toHaveURL(/explore/);
  await page
    .getByLabel("Search activity title, description or subject")
    .fill("An updated little study circle");
  await expect(
    page.getByRole("heading", { name: "Your thing might be the next Spark." }),
  ).toBeVisible();
});
test("actual UNLOCK computation, consent gate, confirmation and completion", async ({
  page,
}, info) => {
  await demo(page);
  await page.goto("/unlock/saturday-doubles");
  await page.getByRole("button", { name: "Run UNLOCK", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Here's a way to make this happen." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Hana · intermediate player" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Adam's spare racket" }),
  ).toBeVisible();
  await page.screenshot({
    path: `.local/screenshots/unlock-${info.project.name}.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Send invitations", exact: true })
    .click();
  await expect(page).toHaveURL(/groups\/saturday-doubles/);
  const confirm = page.getByRole("button", { name: "Confirm this session" });
  await expect(confirm).toBeDisabled();
  await page
    .getByRole("button", { name: "Simulate acceptance", exact: true })
    .first()
    .click();
  await expect(confirm).toBeDisabled();
  await page
    .getByRole("button", { name: "Simulate acceptance", exact: true })
    .first()
    .click();
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect(
    page.getByText("confirmed", { exact: true }).first(),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("confirmed", { exact: true }).first(),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("afterbell-saturday-doubles.ics");
  expect(fs.readFileSync((await download.path())!, "utf8")).toContain(
    "STATUS:CONFIRMED",
  );
  await page.goto("/dashboard");
  await page.getByRole("button", { name: "Confirmed", exact: true }).click();
  await expect(
    page.locator(".plan-row", { hasText: "One more for Saturday doubles?" }),
  ).toBeVisible();
  await page.goto("/groups/saturday-doubles");
  await page.getByRole("button", { name: "Confirm my attendance" }).click();
  await page.getByRole("button", { name: "Mark session completed" }).click();
  await expect(
    page.getByText("completed", { exact: true }).first(),
  ).toBeVisible();
});
test("alternative scheduling and shared resource portfolio use engine inputs", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/unlock/maths-circle");
  await page.getByRole("button", { name: "Run UNLOCK", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Sam · approved maths peer tutor" }),
  ).toBeVisible();
  await expect(page.getByText(/2:00 pm–4:00 pm/i)).toBeVisible();
  await page.getByRole("button", { name: "Analyze all open Sparks" }).click();
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("afterbell-demo-v1")!),
  );
  const a = stored.proposals.find(
      (p: { sparkId: string }) => p.sparkId === "code-and-kopi",
    ),
    b = stored.proposals.find(
      (p: { sparkId: string }) => p.sparkId === "design-workshop",
    );
  expect(a.feasible && b.feasible).toBe(true);
  expect(a.window.start).not.toBe(b.window.start);
  await expect(
    page.getByRole("heading", {
      name: "More possibilities. One shared community.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Show shared connections" }).click();
  await expect(page.locator(".portfolio-row")).toHaveCount(2);
  await expect(
    page.locator(".portfolio-row .shared-offer").first(),
  ).toContainText("shared");
});
test("under-18 demo preferences restrict public community discovery", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/profile");
  await page.getByLabel("Age category", { exact: true }).selectOption("youth");
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/explore");
  await expect(
    page.getByRole("link", {
      name: "One more for Saturday doubles?",
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", {
      name: "Make maths make sense, together.",
      exact: true,
    }),
  ).toBeVisible();
  await page.goto("/hubs");
  await expect(
    page.getByRole("heading", { name: "PJ Social Club" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Meranti Learning Collective" }),
  ).toBeVisible();
  await page.goto("/sparks/saturday-doubles");
  await expect(
    page.getByRole("heading", {
      name: "This Spark is in another little corner.",
    }),
  ).toBeVisible();
});
test("reports, moderation and settings reset are working", async ({ page }) => {
  await demo(page);
  await page.goto("/sparks/saturday-doubles");
  await page.getByRole("button", { name: "Report a concern" }).click();
  await page
    .getByLabel("What should a moderator know?")
    .fill("A fictional concern to test the moderator workflow.");
  await page.getByRole("button", { name: "Submit concern" }).click();
  await page.goto("/settings");
  await expect(
    page.getByText("A fictional concern to test the moderator workflow."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Simulate review" }).click();
  await expect(page.getByText("resolved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset this demo" })
    .click();
  await expect(
    page.getByText("A fictional concern to test the moderator workflow."),
  ).toHaveCount(0);
});
test("every requested route works, with mobile navigation and no overflow", async ({
  page,
}, info) => {
  await demo(page);
  const routes = [
    "/dashboard",
    "/plans",
    "/plans?view=saved",
    "/impact",
    "/explore",
    "/nearby",
    "/study",
    "/tutoring",
    "/badminton",
    "/hubs",
    "/hubs/school-hub",
    "/sparks/create",
    "/sparks/saturday-doubles",
    "/unlock",
    "/unlock/maths-circle",
    "/groups/saturday-doubles",
    "/profile",
    "/settings",
    "/onboarding",
  ];
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBe(200);
    await expect(page.getByRole("heading").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      route,
    ).toBe(true);
  }
  if (info.project.name === "mobile") {
    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page
      .getByRole("navigation", { name: "Discovery and tools" })
      .getByRole("link", { name: "UNLOCK Lab" })
      .click();
    await expect(page).toHaveURL(/unlock/);
  }
});
test("live API refuses demo cookies and cross-origin writes", async ({
  page,
}) => {
  await demo(page);
  expect((await page.request.get("/api/state")).status()).toBe(401);
  expect(
    (
      await page.request.post("/api/mutate", {
        headers: { origin: "http://localhost:3100" },
        data: { op: "confirm", payload: { id: "anything" } },
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await page.request.post("/api/demo", {
        headers: { origin: "https://untrusted.example" },
      })
    ).status(),
  ).toBe(403);
});
test("offers are persistent, withdrawable, and declined invitations stay declined", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/profile");
  await page.getByRole("button", { name: "Add an offer" }).click();
  await page.getByLabel("A name for your offer").fill("My test spare racket");
  await page.getByLabel("I can offer…").selectOption("racket");
  await page.getByRole("button", { name: "Make this offer available" }).click();
  await expect(
    page.getByText("My test spare racket", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText("My test spare racket", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Withdraw My test spare racket" })
    .click();
  await expect(
    page.getByText("My test spare racket", { exact: true }),
  ).toHaveCount(0);
  await page.goto("/unlock/saturday-doubles");
  await page.getByRole("button", { name: "Run UNLOCK", exact: true }).click();
  await page
    .getByRole("button", { name: "Send invitations", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate decline", exact: true })
    .first()
    .click();
  await page.getByRole("link", { name: "Find a replacement" }).click();
  await page.getByRole("button", { name: "Run UNLOCK", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Here's what we found." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send invitations", exact: true }),
  ).toHaveCount(0);
});
test("representative pages meet automated WCAG accessibility checks", async ({
  page,
}) => {
  await demo(page);
  const violations: unknown[] = [];
  for (const route of [
    "/",
    "/dashboard",
    "/plans",
    "/impact",
    "/auth",
    "/nearby",
    "/sparks/create",
    "/unlock/saturday-doubles",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(() => {
          const el = document.querySelector("#main-content");
          return el ? getComputedStyle(el).opacity : "1";
        }),
      )
      .toBe("1");
    if (route === "/impact")
      await expect(
        page.getByRole("img", { name: /Activity impact:/ }),
      ).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    violations.push(
      ...results.violations.map((v) => ({
        route,
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
    );
  }
  fs.writeFileSync(
    ".local/accessibility.json",
    JSON.stringify(violations, null, 2),
  );
  expect(violations).toEqual([]);
});

test("discovery filters survive reload and display the matching time", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/explore");
  await page
    .getByLabel("Filter by city", { exact: true })
    .selectOption("Petaling Jaya");
  await page.getByLabel("Filter by date", { exact: true }).fill("2026-10-24");
  await page.getByLabel("Filter by time of day").selectOption("afternoon");
  await page.getByLabel("Room for more people").check();
  await page.getByLabel("Sort activities").selectOption("spaces");
  await page.getByRole("button", { name: "List view", exact: true }).click();
  await expect(page.locator(".activity-card")).toHaveCount(1);
  await expect(page.locator(".activity-card")).toContainText("2:00 pm MYT");
  await page
    .getByRole("button", {
      name: "Save One more for Saturday doubles?",
      exact: true,
    })
    .click();
  await page.getByLabel("Saved", { exact: true }).check();
  await expect(page).toHaveURL(/saved=1/);
  await page.reload();
  await expect(page.getByLabel("Filter by city", { exact: true })).toHaveValue(
    "Petaling Jaya",
  );
  await expect(page.getByLabel("Filter by date", { exact: true })).toHaveValue(
    "2026-10-24",
  );
  await expect(
    page.getByRole("button", { name: "List view", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".activity-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".activity-card")).toHaveCount(6);
  await page.goto("/explore?q=doubles");
  await expect(page.locator(".activity-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(
    page.getByLabel("Search activity title, description or subject"),
  ).toHaveValue("");
  await expect(page.locator(".activity-card")).toHaveCount(6);
});

test("network inspection and experiments use real dependencies without saving changes", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/unlock/saturday-doubles");
  await page.getByRole("button", { name: "Run UNLOCK", exact: true }).click();
  await page
    .getByRole("button", {
      name: /Hana · intermediate player Explicit approval needed/,
    })
    .click();
  await expect(page.locator(".connection-inspector")).toContainText(
    "Depends on 1 racket",
  );
  await page
    .getByRole("button", { name: "Original plan", exact: true })
    .click();
  await expect(page.locator(".dependency-graph")).not.toContainText("Hana");
  await page
    .getByRole("button", { name: "UNLOCK proposal", exact: true })
    .click();
  await expect(page.locator(".dependency-graph")).toContainText("Hana");
  const before = await page.evaluate(() =>
    localStorage.getItem("afterbell-demo-v1"),
  );
  await page.getByText("What if one piece changed?", { exact: true }).click();
  await page
    .getByLabel("If this offer is unavailable")
    .selectOption({ label: "Adam's spare racket" });
  await page
    .getByRole("button", { name: "Test this scenario", exact: true })
    .click();
  await expect(page.locator(".scenario-result")).toContainText("still blocked");
  expect(
    await page.evaluate(() => localStorage.getItem("afterbell-demo-v1")),
  ).toBe(before);
  await page.getByRole("button", { name: "Reset experiment" }).click();
  await page
    .getByRole("button", { name: "Test this scenario", exact: true })
    .click();
  await expect(page.locator(".scenario-result")).toContainText(
    "Feasible in this simulation",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("afterbell-demo-v1")),
  ).toBe(before);
  await page
    .getByRole("button", { name: "Send invitations", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate acceptance", exact: true })
    .first()
    .click();
  await page.goto("/unlock/saturday-doubles");
  await expect(page.locator(".dependency-node.node-accepted")).toHaveCount(1);
  await expect(
    page.locator(".dependency-node", { hasText: "Adam's spare racket" }),
  ).toContainText("Explicit approval needed");
});

test("nearby discovery filters, profiles, shared plans, and blocking work", async ({
  page,
}, info) => {
  await demo(page);
  await page.goto("/nearby");
  await expect(page.locator(".nearby-person-card")).toHaveCount(6);
  await page.getByLabel("Search distance", { exact: true }).selectOption("5");
  await expect(page.locator(".nearby-person-card")).toHaveCount(3);
  await page.getByLabel("Filter nearby interests").selectOption("Coding");
  await expect(
    page.getByRole("heading", {
      name: "Your people might be a little further out.",
    }),
  ).toBeVisible();
  await page.getByLabel("Filter nearby interests").selectOption("all");
  await page.getByRole("button", { name: "Meet Hana", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("intermediate");
  await expect(page.getByRole("dialog")).toContainText("Weekend mornings");
  await page
    .getByRole("button", { name: "Hide and block Hana", exact: true })
    .click();
  await expect(page.locator(".nearby-person-card")).toHaveCount(2);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Meet Hana", exact: true }),
  ).toHaveCount(0);
  await page
    .getByLabel("Explore around", { exact: true })
    .selectOption("george-town");
  await expect(page.locator(".nearby-person-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Meet Lee", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Computer Science");
  await page
    .getByRole("button", { name: "Explore nearby Sparks", exact: true })
    .click();
  await expect(page.locator(".nearby-spark")).toHaveCount(2);
  await page
    .getByRole("button", { name: "People nearby", exact: true })
    .click();
  await page
    .getByLabel("Explore around", { exact: true })
    .selectOption("petaling-jaya");
  await page.screenshot({
    path: `.local/screenshots/nearby-${info.project.name}.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("nearby profile publishing is an explicit persistent choice", async ({
  page,
}) => {
  await demo(page);
  await page.goto("/nearby");
  await page
    .getByRole("button", { name: "My nearby profile", exact: true })
    .click();
  const visibility = page.getByLabel("Show my profile in nearby discovery", {
    exact: false,
  });
  await expect(visibility).not.toBeChecked();
  await page.getByLabel("Area I’m happy to share").selectOption("ss2");
  await page
    .getByLabel("A little about me")
    .fill("A weekend game and a good study circle.");
  await visibility.check();
  await page
    .getByRole("button", { name: "Save nearby profile", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Manage my listing", exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Explore around", { exact: true })).toHaveValue(
    "ss2",
  );
  await page
    .getByRole("button", { name: "My nearby profile", exact: true })
    .click();
  await expect(page.getByLabel("A little about me")).toHaveValue(
    "A weekend game and a good study circle.",
  );
  await expect(visibility).toBeChecked();
  await visibility.uncheck();
  await page
    .getByRole("button", { name: "Save nearby profile", exact: true })
    .click();
  const settings = await page.evaluate(
    () => JSON.parse(localStorage.getItem("afterbell-demo-v1")!).nearbySettings,
  );
  expect(settings).toEqual({
    areaId: "ss2",
    bio: "A weekend game and a good study circle.",
    visible: false,
  });
  await page
    .getByRole("button", { name: "Choose what to share", exact: true })
    .click();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("device location needs a click and never enters stored state or API requests", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["geolocation"]);
  await context.setGeolocation({
    latitude: 3.118276234,
    longitude: 101.62243638,
    accuracy: 10,
  });
  await demo(page);
  const apiCalls: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/"))
      apiCalls.push(`${request.url()} ${request.postData() ?? ""}`);
  });
  const response = await page.goto("/nearby");
  expect(response?.headers()["permissions-policy"]).toContain(
    "geolocation=(self)",
  );
  await expect(
    page.getByRole("heading", {
      name: "Looking around your current location",
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Looking around your current location",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByLabel("Explore around", { exact: true })).toHaveValue(
    "ss2",
  );
  const stored = await page.evaluate(
    () => localStorage.getItem("afterbell-demo-v1") ?? "",
  );
  expect(stored).not.toContain("3.118276234");
  expect(stored).not.toContain("101.62243638");
  expect(apiCalls.join(" ")).not.toContain("3.118276234");
  expect(apiCalls.join(" ")).not.toContain("101.62243638");
  await page.getByRole("button", { name: /Forget device location/ }).click();
  await expect(
    page.getByRole("heading", {
      name: "Looking around your current location",
      exact: true,
    }),
  ).toHaveCount(0);
  expect(
    (
      await page.request.get("/api/nearby?area=petaling-jaya&radius=25")
    ).status(),
  ).toBe(401);
});

test("location denial falls back to manual areas and youth accounts have no public directory", async ({
  page,
}) => {
  await page.addInitScript(() => {
    let calls = 0;
    Object.defineProperty(window, "__locationCalls", { get: () => calls });
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (
          _success: unknown,
          error: (value: { code: number }) => void,
        ) => {
          calls++;
          error({ code: 1 });
        },
      },
    });
  });
  await demo(page);
  await page.goto("/nearby");
  expect(
    await page.evaluate(() => Reflect.get(window, "__locationCalls")),
  ).toBe(0);
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await expect(
    page.getByText(
      "Location access was denied. You can still choose an area below.",
    ),
  ).toBeVisible();
  await expect(page.locator(".nearby-person-card")).toHaveCount(6);
  await page.goto("/profile");
  await page.getByLabel("Age category", { exact: true }).selectOption("youth");
  await page
    .getByRole("button", { name: "Save preferences", exact: true })
    .click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/nearby");
  await expect(
    page.getByRole("heading", { name: "Your people, in your school spaces." }),
  ).toBeVisible();
  await expect(page.locator(".nearby-person-card")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Use my location", exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(() => Reflect.get(window, "__locationCalls")),
  ).toBe(0);
});
