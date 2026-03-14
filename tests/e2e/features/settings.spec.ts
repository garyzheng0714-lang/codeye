import { test, expect } from '../../fixtures/app';

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ sidebarPage }) => {
    await sidebarPage.openSettings();
    await expect(sidebarPage.settingsPanel).toBeVisible();
  });

  test('shows update-only panel', async ({ sidebarPage }) => {
    await expect(sidebarPage.settingsContent.locator('.settings-section')).toHaveCount(1);
    await expect(sidebarPage.settingsContent.locator('.settings-update-btn')).toBeVisible();
    await expect(sidebarPage.settingsContent).not.toContainText('Codeye v');
  });

  test('shows browser fallback message in web mode', async ({ sidebarPage }) => {
    await expect(sidebarPage.settingsContent).toContainText('Desktop app required for updates.');
  });
});
