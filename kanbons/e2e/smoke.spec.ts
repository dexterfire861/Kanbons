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
  await expect(page.getByText("How it will look")).toBeVisible();
  await expect(page.getByText("KANBONS LLC")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Packing Slip", exact: true })).toBeVisible();
  await expect(page.getByText("INFO@KANBONS.COM")).toBeVisible();
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
  await expect(page.getByRole("columnheader", { name: "Invoice number" })).toBeVisible();
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

test("warehouse check has no save", async ({ page }) => {
  await load(page, "/contador");
  await expect(
    page.getByRole("heading", { name: "Warehouse check" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.locator("form")).toHaveCount(0);
});
