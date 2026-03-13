import { test, expect } from '../../fixtures/app';

test.describe('Settings Panel', () => {
  test.beforeEach(async ({ sidebarPage }) => {
    await sidebarPage.openSettings();
    await expect(sidebarPage.settingsPanel).toBeVisible();
  });

  test('shows 6 settings tabs', async ({ sidebarPage }) => {
    await expect(sidebarPage.settingsTabs).toHaveCount(6);
    await expect(sidebarPage.settingsTabs.nth(0)).toContainText('General');
    await expect(sidebarPage.settingsTabs.nth(1)).toContainText('Model');
    await expect(sidebarPage.settingsTabs.nth(2)).toContainText('Shortcuts');
    await expect(sidebarPage.settingsTabs.nth(3)).toContainText('About');
    await expect(sidebarPage.settingsTabs.nth(4)).toContainText('Hooks');
    await expect(sidebarPage.settingsTabs.nth(5)).toContainText('Skills');
  });

  test('General tab is active by default', async ({ sidebarPage }) => {
    await expect(sidebarPage.activeSettingsTab()).toHaveText('General');
  });

  test('switching to Model tab shows pricing table', async ({ sidebarPage }) => {
    await sidebarPage.switchSettingsTab('Model');
    await expect(sidebarPage.activeSettingsTab()).toHaveText('Model');
    await expect(sidebarPage.settingsContent).toContainText('Model Pricing Reference');
    await expect(sidebarPage.settingsContent.locator('.settings-table')).toBeVisible();
  });

  test('switching to Shortcuts tab shows keyboard shortcuts', async ({ sidebarPage }) => {
    await sidebarPage.switchSettingsTab('Shortcuts');
    await expect(sidebarPage.activeSettingsTab()).toHaveText('Shortcuts');
    await expect(sidebarPage.shortcutRows).toHaveCount(6);
    await expect(sidebarPage.settingsContent).toContainText('New session');
    await expect(sidebarPage.settingsContent).toContainText('Focus input');
    await expect(sidebarPage.settingsContent).toContainText('Toggle sidebar');
  });

  test('switching to About tab shows version and mode', async ({ sidebarPage }) => {
    await sidebarPage.switchSettingsTab('About');
    await expect(sidebarPage.activeSettingsTab()).toHaveText('About');
    await expect(sidebarPage.settingsContent).toContainText('Codeye v0.3.0');
    await expect(sidebarPage.settingsContent).toContainText('Browser Mode');
  });

  test('General tab has theme selector', async ({ sidebarPage }) => {
    await expect(sidebarPage.settingsSelect).toBeVisible();
    await expect(sidebarPage.settingsContent).toContainText('Theme');
  });

  test('switching theme to dark applies dark class', async ({ sidebarPage, page }) => {
    await sidebarPage.settingsSelect.selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('switching theme back to light applies light class', async ({ sidebarPage, page }) => {
    await sidebarPage.settingsSelect.selectOption('dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await sidebarPage.settingsSelect.selectOption('light');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('can switch between all tabs without errors', async ({ sidebarPage }) => {
    for (const tab of ['Model', 'Shortcuts', 'About', 'Hooks', 'Skills', 'General']) {
      await sidebarPage.switchSettingsTab(tab);
      await expect(sidebarPage.activeSettingsTab()).toHaveText(tab);
    }
  });
});
