import { expect, test } from "@playwright/test";

test.describe.configure({ mode: "serial" });

test("新建群聊后 AI 自动接话，可暂停并在刷新后恢复", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "新建群聊" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByPlaceholder("例如：深夜编辑部").fill("冒烟测试群");
  await dialog.getByRole("button", { name: "随机 3 个" }).click();
  await dialog.getByRole("button", { name: "创建群聊" }).click();

  await expect(page).toHaveURL(/\/g\/[0-9a-f-]{36}/, { timeout: 30_000 });

  const bubbles = page.locator(".msg-bubble");
  await expect
    .poll(() => bubbles.count(), { timeout: 45_000, message: "等待 AI 自动发言" })
    .toBeGreaterThanOrEqual(2);

  await page.getByRole("button", { name: "暂停" }).click();
  await expect(page.getByRole("button", { name: "继续聊" })).toBeVisible();

  await page.waitForTimeout(1_500);
  const pausedAt = await bubbles.count();
  await page.waitForTimeout(6_000);
  await expect(bubbles).toHaveCount(pausedAt);

  await page.reload();
  await expect(page.getByRole("button", { name: "继续聊" })).toBeVisible();
  await expect
    .poll(() => bubbles.count(), { timeout: 15_000 })
    .toBeGreaterThanOrEqual(pausedAt);
});

test("角色编辑器：预设性格会填充人设字段", async ({ page }) => {
  await page.goto("/characters");
  await page.getByRole("button", { name: "新建角色" }).first().click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /预设性格/ }).click();
  await dialog.getByRole("button", { name: /段子手/ }).click();

  await expect(dialog.getByRole("combobox", { name: /性格原型/ })).toHaveValue("段子手");
  await expect(dialog.getByPlaceholder("一句话简介，其他 AI 会看到它")).not.toHaveValue("");

  await dialog.getByRole("button", { name: "取消" }).click();
  await expect(dialog).toBeHidden();
});
