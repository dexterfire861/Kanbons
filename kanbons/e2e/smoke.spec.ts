import { expect, test, type Page, type Response } from "@playwright/test";

const pages = [
  { path: "/", heading: "Kanbons" },
  { path: "/customers", heading: "Customers" },
  { path: "/products", heading: "Products" },
  { path: "/product-mappings", heading: "Name matches" },
  { path: "/stock", heading: "Stock" },
  { path: "/shipments", heading: "Incoming containers" },
  { path: "/packing-lists", heading: "Packing lists" },
  { path: "/contador", heading: "Warehouse check" },
];

async function load(page: Page, path: string): Promise<Response> {
  const response = await page.goto(path);
  if (!response) {
    throw new Error(`${path} did not navigate`);
  }
  if (!response.ok()) {
    throw new Error(`${path} returned ${response.status()}`);
  }
  return response;
}

test("home shows the Kanbons bar", async ({ page }) => {
  await load(page, "/");
  const bar = page.getByRole("banner");
  await expect(bar.getByRole("img", { name: "Kanbons" })).toBeVisible();
  await expect(bar.getByText("Kanbons", { exact: true })).toBeVisible();
  await expect(bar).toHaveCSS("background-color", "rgb(1, 35, 63)");
});

test("nav uses warehouse labels", async ({ page }) => {
  await load(page, "/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Home" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Customers" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Products" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Name matches" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Stock" })).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Incoming containers" })
  ).toBeVisible();
  await expect(nav.getByRole("link", { name: "Packing lists" })).toBeVisible();
  await expect(
    nav.getByRole("link", { name: "Warehouse check" })
  ).toBeVisible();
  await expect(nav.getByRole("link", { name: "Health" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Metrics" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Prometheus" })).toHaveCount(0);
  await expect(nav.getByRole("link", { name: "Grafana" })).toHaveCount(0);
});

for (const item of pages) {
  test(`${item.path} loads`, async ({ page }) => {
    await load(page, item.path);
    await expect(
      page.getByRole("heading", { name: item.heading })
    ).toBeVisible();
  });
}

test("home shows today's work and page buttons", async ({ page }) => {
  await load(page, "/");
  await expect(
    page.getByRole("heading", { name: "Customer orders" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Need to pack or ship" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Containers in transit" })
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Go to a page" })).toBeVisible();
  const go = page.locator(".page-buttons");
  await expect(go.getByRole("link", { name: "Customers" })).toBeVisible();
  await expect(go.getByRole("link", { name: "Packing lists" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "New packing slip" })
  ).toBeVisible();
});

test("customers add form does not ask for an id", async ({ page }) => {
  await load(page, "/customers");
  await page.getByRole("button", { name: "Add customer" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Name", { exact: true })).toBeVisible();
  await expect(dialog.locator("input[name='id']")).toHaveCount(0);
});

test("customers can remove a row", async ({ page }) => {
  await load(page, "/customers");
  await page.getByRole("button", { name: "Add customer" }).click();
  const dialog = page.getByRole("dialog");
  const name = `Smoke remove ${Date.now()}`;
  await dialog.locator("input[name='name']").fill(name);
  await dialog.getByRole("button", { name: "Save customer" }).click();
  await expect(dialog).toBeHidden();
  const row = page.getByRole("row", { name: new RegExp(`^${name}`) });
  await expect(row).toBeVisible();
  await expect(row.getByRole("button", { name: "Remove" })).toBeVisible();
  page.once("dialog", (prompt) => prompt.accept());
  await row.getByRole("button", { name: "Remove" }).click();
  await expect(row).toHaveCount(0);
});

test("table pages do not use a Save button", async ({ page }) => {
  for (const path of [
    "/customers",
    "/products",
    "/product-mappings",
    "/stock",
    "/shipments",
    "/packing-lists",
  ]) {
    await load(page, path);
    await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  }
});

test("packing lists offer a new packing slip", async ({ page }) => {
  await load(page, "/packing-lists");
  await expect(page.getByRole("link", { name: "New packing slip" })).toBeVisible();
  await page.getByRole("link", { name: "New packing slip" }).click();
  await expect(page.getByRole("heading", { name: "New packing slip" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm packing slip" })).toBeVisible();
  await expect(page.getByLabel("Purchase order PDF")).toBeVisible();
  await expect(page.getByText("How it will look")).toBeVisible();
  await expect(page.getByText("KANBONS LLC")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Packing Slip", exact: true })).toBeVisible();
  await expect(page.getByText("INFO@KANBONS.COM")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Last reads" })).toBeVisible();
});

test("item code fills from a name match", async ({ page }) => {
  await load(page, "/packing-lists/new");
  const first = await page
    .locator("#as-written-names option")
    .first()
    .getAttribute("value");
  if (!first) {
    throw new Error("No name matches to pick");
  }
  await page.getByLabel("As written on PO").fill(first);
  await expect(page.getByLabel("Item code")).not.toHaveValue("");
});

test("ship to and bill to find a customer by code or name", async ({ page }) => {
  const stamp = Date.now();
  const shipName = `Smoke ship ${stamp}`;
  const shipCode = `SHP${stamp}`;
  const billName = `Smoke bill ${stamp}`;
  await load(page, "/customers");
  await page.getByRole("button", { name: "Add customer" }).click();
  let dialog = page.getByRole("dialog");
  await dialog.locator("input[name='name']").fill(shipName);
  await dialog.getByLabel("Customer code").fill(shipCode);
  await dialog.getByLabel("Address", { exact: true }).fill("10 Ship Street");
  await dialog.getByLabel("City").fill("Columbus");
  await dialog.getByLabel("State").fill("OH");
  await dialog.getByLabel("ZIP").fill("43215");
  await dialog.getByRole("button", { name: "Save customer" }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Add customer" }).click();
  dialog = page.getByRole("dialog");
  await dialog.locator("input[name='name']").fill(billName);
  await dialog.getByLabel("Customer code").fill(`BIL${stamp}`);
  await dialog.getByLabel("Address", { exact: true }).fill("20 Bill Avenue");
  await dialog.getByLabel("City").fill("Dayton");
  await dialog.getByLabel("State").fill("OH");
  await dialog.getByLabel("ZIP").fill("45402");
  await dialog.getByRole("button", { name: "Save customer" }).click();
  await expect(dialog).toBeHidden();

  await load(page, "/packing-lists/new");
  const ship = page.getByRole("group", { name: "Ship to" });
  await ship.getByLabel("Customer or code").fill(shipCode);
  const customer = page.getByRole("combobox", { name: "Customer", exact: true });
  await expect(customer).toHaveValue(/.+/);
  await expect(customer).toContainText(shipName);
  await expect(ship.getByLabel("Address")).toHaveValue("10 Ship Street");
  await expect(ship.getByLabel("City")).toHaveValue("Columbus");
  const customerBefore = await customer.inputValue();

  const bill = page.getByRole("group", { name: "Bill to" });
  await bill.getByLabel("Customer or code").fill(billName);
  await expect(bill.getByLabel("Address")).toHaveValue("20 Bill Avenue");
  await expect(bill.getByLabel("City")).toHaveValue("Dayton");
  await expect(customer).toHaveValue(customerBefore);
});

test("new packing slip names can be saved for next time", async ({ page }) => {
  await load(page, "/packing-lists/new");
  await page.getByRole("combobox", { name: "Customer", exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Purchase order number").fill("HEAL-1");
  const name = `Heal name ${Date.now()}`;
  await page.getByLabel("As written on PO").fill(name);
  await expect(page.getByText(/No name match for:/)).toBeVisible();
  await page.getByRole("button", { name: "Select product" }).click();
  const pick = page.locator(".picker-open li button").nth(1);
  await expect(pick).toBeVisible();
  await pick.click();
  await expect(
    page.getByRole("button", { name: "Confirm packing slip" })
  ).toBeEnabled();
  await page.getByRole("button", { name: "Confirm packing slip" }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("heading", {
      name: "Save these names so the next order finds them?",
    })
  ).toBeVisible();
  await expect(dialog.getByText("Customer name", { exact: true })).toBeVisible();
  await expect(dialog.locator("input[name='id']")).toHaveCount(0);
  await expect(dialog.getByLabel("Customer name")).toHaveValue(name);
});

test("packing list lines are not dumped on the list page", async ({ page }) => {
  await load(page, "/packing-lists");
  await expect(page.getByRole("heading", { name: "Packing lists" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Yards / pieces" })).toHaveCount(
    0
  );
  const lines = page.getByRole("link", { name: "Lines" }).first();
  await expect(lines).toBeVisible();
  await lines.click();
  await expect(
    page.getByRole("columnheader", { name: "Yards / pieces" })
  ).toBeVisible();
});

test("packing list add does not ask for a number", async ({ page }) => {
  await load(page, "/packing-lists");
  await expect(page.getByPlaceholder("Assigned on save")).toBeVisible();
});

test("shipment lines are not dumped on the list page", async ({ page }) => {
  await load(page, "/shipments");
  await expect(
    page.getByRole("heading", { name: "Incoming containers" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add container" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Yards / pieces" })).toHaveCount(
    0
  );
  const container = page.getByRole("link", { name: /Container / }).first();
  await expect(container).toBeVisible();
  await container.click();
  await expect(
    page.getByRole("columnheader", { name: "Yards / pieces" })
  ).toBeVisible();
});

test("warehouse check has no page save", async ({ page }) => {
  await load(page, "/contador");
  await expect(
    page.getByRole("heading", { name: "Warehouse check" })
  ).toBeVisible();
  await expect(page.getByLabel("Find a product")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  const adjust = page.getByRole("button", { name: "Adjust count" });
  if ((await adjust.count()) > 0) {
    await adjust.first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Add to warehouse count")).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Save count" })).toBeVisible();
    await dialog.getByRole("button", { name: "Cancel" }).click();
  }
});

test("stock has search and change stock", async ({ page }) => {
  await load(page, "/stock");
  await expect(page.getByLabel("Find a product")).toBeVisible();
  await expect(page.getByRole("button", { name: "Change stock" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Change history" })).toBeVisible();
});

test("name matches can be added from a dialog", async ({ page }) => {
  await load(page, "/product-mappings");
  await expect(page.getByLabel("Find a name")).toBeVisible();
  await page.getByRole("button", { name: "Add name match" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Customer name", { exact: true })).toBeVisible();
  await expect(dialog.locator("input[name='id']")).toHaveCount(0);
});

test("change history is not in the nav", async ({ page }) => {
  const response = await load(page, "/changes");
  expect(response.ok()).toBeTruthy();
  await expect(page.getByRole("heading", { name: "Change history" })).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "Change history" })
  ).toHaveCount(0);
});

test("health says whether the database is answering", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ ok: true, database: true });
});

test("metrics expose database up for Prometheus", async ({ request }) => {
  const response = await request.get("/metrics");
  expect(response.ok()).toBeTruthy();
  const body = await response.text();
  expect(body).toContain("kanbons_database_up");
});
