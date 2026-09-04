import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", heading: "Kanbons" },
  { path: "/customers", heading: "Customers" },
  { path: "/products", heading: "Products" },
  { path: "/stock", heading: "Stock" },
  { path: "/shipments", heading: "Incoming containers" },
  { path: "/packing-lists", heading: "Packing lists" },
  { path: "/contador", heading: "Warehouse check" },
];

test("nav uses warehouse labels", async ({ page }) => {
  await page.goto("/");
  const nav = page.getByRole("navigation");
  await expect(nav.getByRole("link", { name: "Customers" })).toBeVisible();
  await expect(nav.getByRole("link", { name: "Products" })).toBeVisible();
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
    const response = await page.goto(item.path);
    expect(response?.ok()).toBeTruthy();
    await expect(
      page.getByRole("heading", { name: item.heading })
    ).toBeVisible();
  });
}

test("customers add form does not ask for an id", async ({ page }) => {
  await page.goto("/customers");
  await page.getByRole("button", { name: "Add customer" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Name", { exact: true })).toBeVisible();
  await expect(dialog.locator("input[name='id']")).toHaveCount(0);
});

test("packing lists offer a new packing slip", async ({ page }) => {
  await page.goto("/packing-lists");
  await expect(page.getByRole("link", { name: "New packing slip" })).toBeVisible();
  await page.getByRole("link", { name: "New packing slip" }).click();
  await expect(page.getByRole("heading", { name: "New packing slip" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm packing slip" })).toBeVisible();
  await expect(page.getByText("How it will look")).toBeVisible();
  await expect(page.getByText("KANBONS LLC")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Packing Slip" })).toBeVisible();
  await expect(page.getByText("INFO@KANBONS.COM")).toBeVisible();
});

test("packing list lines are not dumped on the list page", async ({ page }) => {
  await page.goto("/packing-lists");
  await expect(page.getByRole("heading", { name: "Packing lists" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Yards / pieces" })).toHaveCount(
    0
  );
  const lines = page.getByRole("link", { name: "Lines" }).first();
  if (await lines.count()) {
    await lines.click();
    await expect(
      page.getByRole("columnheader", { name: "Yards / pieces" })
    ).toBeVisible();
  }
});

test("shipment lines are not dumped on the list page", async ({ page }) => {
  await page.goto("/shipments");
  await expect(
    page.getByRole("heading", { name: "Incoming containers" })
  ).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Invoice number" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "Yards / pieces" })).toHaveCount(
    0
  );
});

test("warehouse check has no save", async ({ page }) => {
  await page.goto("/contador");
  await expect(
    page.getByRole("heading", { name: "Warehouse check" })
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Save" })).toHaveCount(0);
  await expect(page.locator("form")).toHaveCount(0);
});
