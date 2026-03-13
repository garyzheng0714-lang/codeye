import { test, expect } from '../../fixtures/app';

test.describe('Model Config Selector', () => {
  test('config selector is visible and shows default Sonnet', async ({ chatPage }) => {
    await expect(chatPage.configSelector).toBeVisible();
    await expect(chatPage.currentModelLabel()).toHaveText('Sonnet');
  });

  test('clicking trigger opens dropdown with model and effort options', async ({ chatPage }) => {
    await chatPage.openConfigSelector();
    await expect(chatPage.configDropdown).toBeVisible();
    // 3 models + 3 effort levels = 6 options
    await expect(chatPage.configOptions).toHaveCount(6);
  });

  test('selecting Opus updates trigger label', async ({ chatPage }) => {
    await chatPage.selectModel('Opus');
    await expect(chatPage.configDropdown).not.toBeVisible();
    await expect(chatPage.currentModelLabel()).toHaveText('Opus');
  });

  test('selecting Haiku updates trigger label', async ({ chatPage }) => {
    await chatPage.selectModel('Haiku');
    await expect(chatPage.currentModelLabel()).toHaveText('Haiku');
  });

  test('model persists after re-selecting', async ({ chatPage }) => {
    await chatPage.selectModel('Opus');
    await expect(chatPage.currentModelLabel()).toHaveText('Opus');
    await chatPage.selectModel('Haiku');
    await expect(chatPage.currentModelLabel()).toHaveText('Haiku');
  });

  test('Escape closes the dropdown', async ({ chatPage, page }) => {
    await chatPage.openConfigSelector();
    await expect(chatPage.configDropdown).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(chatPage.configDropdown).not.toBeVisible();
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
