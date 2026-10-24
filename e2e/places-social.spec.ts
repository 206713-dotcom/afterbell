import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origin = "http://localhost:3100";
async function account(
  request: APIRequestContext,
  name: string,
  email: string,
) {
  const signup = await request.post("/api/account", {
    headers: { origin },
    data: { action: "register", email, password: "social-test-password-123" },
  });
  expect(signup.ok()).toBe(true);
  const profile = await request.post("/api/mutate", {
    headers: { origin },
    data: {
      op: "profile",
      payload: {
        name,
        city: "Petaling Jaya",
        age: "adult",
        interests: ["Study", "Badminton"],
        subjects: [],
        availability: [],
        experience: "Intermediate",
        communityTypes: [],
        discoverable: true,
      },
    },
  });
  expect(profile.ok()).toBe(true);
  return (await (await request.get("/api/state")).json()).profile.id;
}
async function audit(page: Page) {
  await expect
    .poll(() =>
      page
        .locator("#main-content")
        .evaluate((el) => getComputedStyle(el).opacity),
    )
    .toBe("1");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}
test("finds a real court, keeps booking fields through a draft, and offers study spaces", async ({
  page,
}) => {
  await page.request.post("/api/demo", { headers: { origin } });
  await page.goto("/places");
  await expect(
    page.getByRole("main").getByText("55 places in KL & Selangor"),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Search badminton centres" })
    .fill("New Vision");
  await expect(page.locator(".place-card")).toHaveCount(1);
  await page.getByRole("button", { name: "Choose this centre" }).click();
  await page.getByRole("link", { name: "Make a plan here" }).click();
  await expect(page.getByLabel("City or district")).toHaveValue(
    "Petaling Jaya",
  );
  await expect(page.locator(".selected-place")).toContainText("New Vision");
  await page.getByRole("button", { name: "Change", exact: true }).click();
  const picker = page.getByRole("dialog", { name: "Find a badminton centre" });
  await expect(picker).toBeVisible();
  await picker
    .getByRole("textbox", { name: "Search badminton centres" })
    .fill("New Vision");
  await picker
    .getByRole("textbox", { name: "Search badminton centres" })
    .press("Enter");
  await expect(picker).toBeVisible();
  await picker.getByRole("button", { name: "Choose this centre" }).click();
  await page.getByLabel("Give it a name").fill("Friday at New Vision courts");
  await page
    .getByLabel("Tell people a little more")
    .fill("Bring your racket and join a friendly game at our chosen centre.");
  await page.getByLabel("Court number / name").fill("Court 7");
  await page.getByLabel("I have a booking confirmation from the venue").check();
  await page
    .getByLabel("Booking reference · private to you")
    .fill("DEMO-ONLY-REFERENCE");
  await audit(page);
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/plans?view=drafts");
  await page.getByText("Friday at New Vision courts", { exact: true }).click();
  await expect(page.getByLabel("Court number / name")).toHaveValue("Court 7");
  await expect(
    page.getByLabel("Booking reference · private to you"),
  ).toHaveValue("DEMO-ONLY-REFERENCE");
  await page.reload();
  await expect(page.getByLabel("Court number / name")).toHaveValue("Court 7");
  await page.goto("/places?kind=study");
  await page
    .getByRole("textbox", { name: "Search study spaces" })
    .fill("Sandbox");
  await expect(page.locator(".place-card")).toHaveCount(2);
  await audit(page);
});

test("school picker opens shared school chat and retains messages after reload", async ({
  page,
}) => {
  await page.request.post("/api/demo", { headers: { origin } });
  await page.goto("/schools");
  const school = page.locator(".school-card", {
    hasText: "Meranti Learning Collective",
  });
  await school.getByRole("button", { name: "Set as my school" }).click();
  await expect(school.getByText("Your school", { exact: true })).toBeVisible();
  await school.getByRole("link", { name: "Open school chat" }).click();
  await expect(
    page.getByRole("heading", { name: "School common room" }),
  ).toBeVisible();
  await page
    .getByLabel("Your message")
    .fill("Anyone revising algebra after school?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("log")).toContainText(
    "Anyone revising algebra after school?",
  );
  await page.reload();
  await expect(page.getByRole("log")).toContainText(
    "Anyone revising algebra after school?",
  );
  await audit(page);
  await page.goto("/schools");
  const bayu = page.locator(".school-card", {
    hasText: "Bayu School Community",
  });
  await bayu.getByRole("button", { name: "Choose my school" }).click();
  await expect(
    bayu.getByRole("button", { name: "Approval pending" }),
  ).toBeDisabled();
  await expect(
    bayu.getByRole("link", { name: "Open school chat" }),
  ).toHaveCount(0);
});

test("separate accounts accept friend requests, exchange persistent messages and block access", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(90000);
  const suffix = Date.now() + "-" + info.project.name;
  const ownerName = `Morgan ${Date.now().toString(36)}`;
  const peerName = `Riley ${Date.now().toString(36)}`;
  const ownerId = await account(
    page.request,
    ownerName,
    `social-owner-${suffix}@example.com`,
  );
  const peerContext = await browser.newContext({
    viewport: page.viewportSize()!,
  });
  const outsider = await browser.newContext();
  try {
    await account(
      peerContext.request,
      peerName,
      `social-peer-${suffix}@example.com`,
    );
    await account(
      outsider.request,
      "Outside Social",
      `social-other-${suffix}@example.com`,
    );
    await page.goto("/connections");
    await page
      .getByRole("button", { name: "Discover people", exact: true })
      .click();
    await page.getByLabel("Search people to connect with").fill(peerName);
    await page
      .locator(".person-card", { hasText: peerName })
      .getByRole("button", { name: "Send friend request" })
      .click();
    const peer = await peerContext.newPage();
    await peer.goto(origin + "/connections");
    await peer.getByRole("button", { name: /^Requests/ }).click();
    await peer
      .locator(".friend-request", { hasText: ownerName })
      .getByRole("button", { name: "Accept", exact: true })
      .click();
    await page.bringToFront();
    await page
      .getByRole("button", { name: "My connections", exact: true })
      .click();
    await page
      .locator(".connection-row")
      .getByRole("button", {
        name: `Open conversation with ${peerName}`,
        exact: true,
      })
      .click({ timeout: 15000 });
    await page.getByLabel("Your message").fill("Meet at the library at four?");
    await page.getByRole("button", { name: "Send message" }).click();
    await peer.bringToFront();
    await peer
      .getByRole("button", { name: "My connections", exact: true })
      .click();
    await peer
      .locator(".connection-row")
      .getByRole("button", {
        name: `Open conversation with ${ownerName}`,
        exact: true,
      })
      .click();
    await expect(peer.getByRole("log")).toContainText(
      "Meet at the library at four?",
      { timeout: 12000 },
    );
    await peer.getByLabel("Your message").fill("See you there!");
    await peer.getByRole("button", { name: "Send message" }).click();
    await page.bringToFront();
    await expect(page.getByRole("log")).toContainText("See you there!", {
      timeout: 12000,
    });
    const otherState = await (
      await outsider.request.get(origin + "/api/state")
    ).json();
    expect(otherState.messages).toEqual([]);
    expect(otherState.connections).toEqual([]);
    await page.reload();
    await page
      .locator(".connection-row")
      .getByRole("button", {
        name: `Open conversation with ${peerName}`,
        exact: true,
      })
      .click();
    await expect(page.getByRole("log")).toContainText("See you there!");
    await audit(page);
    await page
      .getByRole("button", { name: "Block person", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Block person", exact: true })
      .click();
    await expect(page.locator(".connection-row")).toHaveCount(0);
    const peerState = await (
      await peerContext.request.get(origin + "/api/state")
    ).json();
    expect(peerState.messages).toEqual([]);
    expect(
      peerState.connectionPeople.some((p: { id: string }) => p.id === ownerId),
    ).toBe(false);
  } finally {
    await peerContext.close();
    await outsider.close();
  }
});
