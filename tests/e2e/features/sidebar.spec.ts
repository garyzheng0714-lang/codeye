import { test, expect } from '../../fixtures/app';

test.describe('Sidebar', () => {
  test('can toggle sidebar with Ctrl+B', async ({ appPage, sidebarPage }) => {
    await sidebarPage.openSessions();
    await expect(appPage.sidebar).toBeVisible();

    await appPage.toggleSidebar();
    await expect(appPage.appBody).toHaveClass(/sidebar-collapsed/);

    await appPage.toggleSidebar();
    await expect(appPage.appBody).not.toHaveClass(/sidebar-collapsed/);
  });

  test('activity bar buttons toggle sidebar panels', async ({ sidebarPage }) => {
    await sidebarPage.openSettings();
    await expect(sidebarPage.settingsPanel).toBeVisible();

    await sidebarPage.openSessions();
    await expect(sidebarPage.settingsPanel).not.toBeVisible();
  });

  test('boundary logo collapses and sessions icon reopens the sidebar', async ({ appPage, sidebarPage }) => {
    await appPage.boundaryToggle.click();
    await expect(appPage.appBody).toHaveClass(/sidebar-collapsed/);

    await sidebarPage.openSessions();
    await expect(appPage.appBody).not.toHaveClass(/sidebar-collapsed/);
  });

  test('search input has aria-label', async ({ sidebarPage }) => {
    await expect(sidebarPage.searchInput).toHaveAttribute('aria-label', 'Search sessions');
  });
});
