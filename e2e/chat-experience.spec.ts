import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const origin = "http://localhost:3100";
const draftKeys = (page: Page) =>
  page.evaluate(() =>
    Object.keys(sessionStorage).filter((k) =>
      k.startsWith("afterbell-chat-draft:v1:"),
    ),
  );
async function account(
  request: APIRequestContext,
  suffix: string,
  name: string,
) {
  expect(
    (
      await request.post(origin + "/api/account", {
        headers: { origin },
        data: {
          action: "register",
          email: `chat-${suffix}@example.com`,
          password: "chat-experience-password-123",
        },
      })
    ).ok(),
  ).toBe(true);
  expect(
    (
      await request.post(origin + "/api/mutate", {
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
      })
    ).ok(),
  ).toBe(true);
  return (await (await request.get(origin + "/api/state")).json()).profile
    .id as string;
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

test("conversation search and previews work, with separate drafts across chats and reloads", async ({
  page,
}) => {
  await page.request.post("/api/demo", { headers: { origin } });
  await page.goto("/connections?view=requests");
  await page
    .locator(".friend-request", { hasText: "Hana" })
    .getByRole("button", { name: "Accept", exact: true })
    .click();
  await page
    .getByRole("button", { name: "My connections", exact: true })
    .click();
  await page.getByLabel("Search your connections").fill("Adam");
  await expect(page.locator(".connection-row")).toHaveCount(1);
  await expect(page.locator(".connection-preview")).toContainText("Hey Alex!");
  await page.getByRole("button", { name: "Clear connection search" }).click();
  await page
    .getByRole("button", { name: "Open conversation with Adam", exact: true })
    .click();
  await page.getByLabel("Your message").fill("Adam, should we play at four?");
  await expect(
    page.getByText("Draft saved in this tab for up to 24 hours."),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open conversation with Hana", exact: true })
    .click();
  await expect(page.getByLabel("Your message")).toBeEmpty();
  await page.getByLabel("Your message").fill("Hana, library after class?");
  await page.reload();
  await expect(page.getByLabel("Your message")).toHaveValue(
    "Hana, library after class?",
  );
  await page
    .getByRole("button", { name: "Open conversation with Adam", exact: true })
    .click();
  await expect(page.getByLabel("Your message")).toHaveValue(
    "Adam, should we play at four?",
  );
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByLabel("Your message")).toBeEmpty();
  await expect(page.getByRole("log")).toContainText(
    "Adam, should we play at four?",
  );
  await page.reload();
  await expect(page.getByLabel("Your message")).toBeEmpty();
  await page.goto("/hubs/school-hub?tab=chat");
  await page.getByLabel("Your message").fill("A separate school draft");
  await page.goto("/connections?chat=demo-hana-request");
  await expect(page.getByLabel("Your message")).toHaveValue(
    "Hana, library after class?",
  );
  await page
    .getByRole("button", { name: "Discard draft", exact: true })
    .click();
  await page.reload();
  await expect(page.getByLabel("Your message")).toBeEmpty();
  await audit(page);
  expect((await draftKeys(page)).length).toBe(1);
  await page.getByRole("button", { name: "Exit demo", exact: true }).click();
  await expect(page).toHaveURL(origin + "/");
  expect(await draftKeys(page)).toEqual([]);
});

test("real chats retain failed sends, preserve reading position and purge blocked drafts", async ({
  page,
  browser,
}, info) => {
  test.setTimeout(90000);
  const suffix = `${Date.now()}-${info.project.name}`;
  const owner = await account(page.request, `owner-${suffix}`, "River Chat");
  const peer = await browser.newContext({ viewport: page.viewportSize()! });
  try {
    const other = await account(peer.request, `peer-${suffix}`, "Jamie Chat");
    expect(
      (
        await page.request.post("/api/mutate", {
          headers: { origin },
          data: { op: "connect", payload: { id: other } },
        })
      ).ok(),
    ).toBe(true);
    const state = await (await peer.request.get(origin + "/api/state")).json();
    const connection = state.connections.find(
      (c: { requesterId: string }) => c.requesterId === owner,
    ).id;
    expect(
      (
        await peer.request.post(origin + "/api/mutate", {
          headers: { origin },
          data: {
            op: "connectionRespond",
            payload: { id: connection, accept: true },
          },
        })
      ).ok(),
    ).toBe(true);
    for (let n = 1; n <= 3; n++)
      expect(
        (
          await peer.request.post(origin + "/api/mutate", {
            headers: { origin },
            data: {
              op: "chatSend",
              payload: {
                connectionId: connection,
                body: `Earlier note ${n}. ${"Let's plan the weekend game and bring a spare racket. ".repeat(22)}`,
              },
            },
          })
        ).ok(),
      ).toBe(true);
    await page.goto(`/connections?chat=${connection}`);
    await expect(page.getByRole("log").locator("article")).toHaveCount(3);
    await page.getByLabel("Your message").fill("A message to retry safely");
    await page.route(
      "**/api/mutate",
      (route) =>
        route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Chat is temporarily unavailable." }),
        }),
      { times: 1 },
    );
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(
      page
        .getByText("Chat is temporarily unavailable.", { exact: true })
        .first(),
    ).toBeVisible();
    await expect(page.getByLabel("Your message")).toHaveValue(
      "A message to retry safely",
    );
    await page.reload();
    await expect(page.getByLabel("Your message")).toHaveValue(
      "A message to retry safely",
    );
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await expect(page.getByLabel("Your message")).toBeEmpty();
    await expect(page.getByRole("log")).toContainText(
      "A message to retry safely",
    );
    expect(await draftKeys(page)).toEqual([]);
    const log = page.getByRole("log");
    await log.evaluate((el) => {
      el.scrollTop = 0;
      el.dispatchEvent(new Event("scroll", { bubbles: true }));
    });
    expect(
      (
        await peer.request.post(origin + "/api/mutate", {
          headers: { origin },
          data: {
            op: "chatSend",
            payload: {
              connectionId: connection,
              body: "A fresh incoming message while you read",
            },
          },
        })
      ).ok(),
    ).toBe(true);
    await expect(log).toContainText("A fresh incoming message while you read", {
      timeout: 12000,
    });
    expect(await log.evaluate((el) => el.scrollTop)).toBeLessThan(5);
    await page
      .getByRole("button", {
        name: "New messages · Jump to latest",
        exact: true,
      })
      .click();
    await expect
      .poll(() =>
        log.evaluate((el) => el.scrollHeight - el.scrollTop - el.clientHeight),
      )
      .toBeLessThan(5);
    await page
      .getByLabel("Your message")
      .fill("This draft should disappear on block");
    await audit(page);
    await page
      .getByRole("button", { name: "Block person", exact: true })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Block person", exact: true })
      .click();
    await expect(page.locator(".connection-row")).toHaveCount(0);
    expect(await draftKeys(page)).toEqual([]);
  } finally {
    await peer.close();
  }
});

test("activity creation uses the selected category and tomorrow in Malaysia, retaining saved dates", async ({
  page,
}, info) => {
  await account(
    page.request,
    `form-${Date.now()}-${info.project.name}`,
    "Casey Plans",
  );
  await page.clock.setFixedTime(new Date("2026-12-31T18:00:00Z"));
  await page.goto("/study");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Create a Spark", exact: true })
    .click();
  await expect(page).toHaveURL(/category=study/);
  await expect(page.getByLabel("Your kind of thing")).toHaveValue("study");
  await expect(page.getByLabel("Skill, level, or subject")).toHaveValue(
    "Maths",
  );
  await expect(page.getByLabel("Preferred date (Malaysia time)")).toHaveValue(
    "2027-01-02",
  );
  await page.getByLabel("Give it a name").fill("A study plan for the new year");
  await page
    .getByLabel("Tell people a little more")
    .fill(
      "A focused session to revise maths and share useful questions together.",
    );
  await page.getByRole("button", { name: "Save draft", exact: true }).click();
  await expect(page).toHaveURL(/dashboard/);
  await page.goto("/plans?view=drafts");
  await page
    .getByText("A study plan for the new year", { exact: true })
    .click();
  await expect(page.getByLabel("Preferred date (Malaysia time)")).toHaveValue(
    "2027-01-02",
  );
  await expect(page.getByLabel("Your kind of thing")).toHaveValue("study");
  await page.goto("/sparks/create?category=badminton&venue=metime-jaya-one");
  await expect(page.getByLabel("Your kind of thing")).toHaveValue("study");
  await expect(page.locator(".selected-place")).toContainText("MeTime");
  await audit(page);
});
