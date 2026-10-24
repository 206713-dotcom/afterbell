import { chromium } from "@playwright/test";
const base = process.env.AFTERBELL_SMOKE_URL ?? "http://localhost:3001";
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.getByRole("button", { name: /Try the live demo/ }).click();
  await page.waitForURL("**/dashboard");
  const nearbyPage = await page.goto(`${base}/nearby`);
  if (
    !nearbyPage.headers()["permissions-policy"].includes("geolocation=(self)")
  )
    throw new Error("Same-origin geolocation is not enabled");
  await page.getByRole("button", { name: "Meet Hana", exact: true }).click();
  if (
    !(await page.getByRole("dialog").innerText()).includes("Weekend mornings")
  )
    throw new Error("Nearby profile details are missing");
  await page.getByRole("button", { name: "Close dialog", exact: true }).click();
  await page.context().grantPermissions(["geolocation"]);
  await page
    .context()
    .setGeolocation({
      latitude: 3.118276234,
      longitude: 101.62243638,
      accuracy: 10,
    });
  await page
    .getByRole("button", { name: "Use my location", exact: true })
    .click();
  await page
    .getByRole("heading", {
      name: "Looking around your current location",
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "See area map", exact: true }).click();
  const mapUrl = await page
    .getByTitle("Area map around SS2, Petaling Jaya")
    .getAttribute("src");
  if (mapUrl.includes("3.118276234") || mapUrl.includes("101.62243638"))
    throw new Error("Device coordinates reached an area map URL");
  if (
    (
      await page.request.get(`${base}/api/nearby?area=petaling-jaya&radius=25`)
    ).status() !== 401
  )
    throw new Error("Demo cookie authorized the live nearby API");
  await page.goto(`${base}/explore`);
  await page
    .getByLabel("Filter by city", { exact: true })
    .selectOption("Petaling Jaya");
  await page.getByLabel("Filter by time of day").selectOption("afternoon");
  await page.getByLabel("Room for more people").check();
  if (
    !(await page.locator(".activity-card").innerText()).includes("2:00 pm MYT")
  )
    throw new Error("Discovery did not show the matching afternoon slot");
  await page.reload();
  if (!(await page.getByLabel("Room for more people").isChecked()))
    throw new Error("Discovery filters did not survive reload");
  await page.goto(`${base}/unlock/saturday-doubles`);
  await page.getByRole("button", { name: "Run UNLOCK", exact: true }).click();
  await page
    .getByRole("button", {
      name: /Hana · intermediate player Explicit approval needed/,
    })
    .click();
  if (
    !(await page.locator(".connection-inspector").innerText()).includes(
      "Depends on 1 racket",
    )
  )
    throw new Error("Dependency inspector did not explain the required racket");
  await page
    .getByRole("button", { name: "Send invitations", exact: true })
    .click();
  const confirm = page.getByRole("button", { name: "Confirm this session" });
  if (await confirm.isEnabled())
    throw new Error("Consent gate failed before any acceptance");
  await page
    .getByRole("button", { name: "Simulate acceptance", exact: true })
    .first()
    .click();
  if (await confirm.isEnabled())
    throw new Error("Consent gate failed after one acceptance");
  await page
    .getByRole("button", { name: "Simulate acceptance", exact: true })
    .first()
    .click();
  await confirm.click();
  await page.getByText("confirmed", { exact: true }).first().waitFor();
  const calendarEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Add to calendar" }).click();
  if (
    (await calendarEvent).suggestedFilename() !==
    "afterbell-saturday-doubles.ics"
  )
    throw new Error("Confirmed session calendar export failed");
  await page.reload();
  await page.getByText("confirmed", { exact: true }).first().waitFor();
  if ((await page.request.get(`${base}/api/state`)).status() !== 401)
    throw new Error("Demo cookie authorized a live API");
  if (errors.length) throw new Error(errors.join("\n"));
  console.log(
    "Production smoke passed: homepage, nearby profiles, synthetic geolocation, broad-area map, persistent discovery filters, dependency inspector, actual solver, independent approvals, confirmation, calendar download, reload persistence, live API isolation, no browser exceptions.",
  );
} finally {
  await browser.close();
}
