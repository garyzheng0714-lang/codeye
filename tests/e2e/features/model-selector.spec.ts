import { test, expect } from '../../fixtures/app';

test.describe('Model Selector', () => {
  test('model selector is visible and shows default Sonnet', async ({ chatPage }) => {
    await expect(chatPage.modelSelector).toBeVisible();
    await expect(chatPage.currentModelLabel()).toHaveText('Sonnet');
  });

  test('clicking trigger opens dropdown with 3 options', async ({ chatPage }) => {
    await chatPage.openModelSelector();
    await expect(chatPage.modelDropdown).toBeVisible();
    await expect(chatPage.modelOptions).toHaveCount(3);
  });

  test('selecting Opus updates trigger label', async ({ chatPage }) => {
    await chatPage.selectModel('Opus');
    await expect(chatPage.modelDropdown).not.toBeVisible();
    await expect(chatPage.currentModelLabel()).toHaveText('Opus');
  });

  test('selecting Haiku updates trigger label', async ({ chatPage }) => {
    await chatPage.selectModel('Haiku');
    await expect(chatPage.currentModelLabel()).toHaveText('Haiku');
  });

  test('status bar shows model in selector', async ({ appPage, chatPage }) => {
    await chatPage.selectModel('Opus');
    const label = appPage.page.locator('.status-bar .model-selector-label');
    await expect(label).toHaveText('Opus');
  });

  test('Escape closes the dropdown', async ({ chatPage, page }) => {
    await chatPage.openModelSelector();
    await expect(chatPage.modelDropdown).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(chatPage.modelDropdown).not.toBeVisible();
  });

  test('slash command /opus switches model', async ({ chatPage }) => {
    await chatPage.selectSlashCommand('opus');
    await expect(chatPage.currentModelLabel()).toHaveText('Opus');
  });

  test('slash command /haiku switches model', async ({ chatPage }) => {
    await chatPage.selectSlashCommand('haiku');
    await expect(chatPage.currentModelLabel()).toHaveText('Haiku');
  });
});
