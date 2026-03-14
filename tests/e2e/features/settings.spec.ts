import { test, expect } from '../../fixtures/app';

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ sidebarPage }) => {
    await sidebarPage.openSettings();
    await expect(sidebarPage.settingsPanel).toBeVisible();
  });

  test('shows version info', async ({ sidebarPage }) => {
    await expect(sidebarPage.settingsContent).toContainText('Codeye v0.3.0');
  });

  test('shows updates section with browser fallback message', async ({ sidebarPage }) => {
    await expect(sidebarPage.settingsContent).toContainText('Updates');
    await expect(sidebarPage.settingsContent).toContainText('browser');
  });
});
