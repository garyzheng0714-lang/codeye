import { test, expect } from '../fixtures/app';

test.describe('App Launch', () => {
  test('renders the welcome screen with Codeye title', async ({ appPage }) => {
    await expect(appPage.welcomeTitle).toHaveText('Codeye');
  });

  test('renders title bar with submit split button', async ({ appPage }) => {
    await expect(appPage.titleBarActions).toBeVisible();
    await expect(appPage.page.locator('.git-split-main')).toContainText('Submit');
  });

  test('renders activity bar and sidebar', async ({ appPage }) => {
    await expect(appPage.activityBar).toBeVisible();
    await expect(appPage.sidebar).toBeVisible();
  });

  test('renders main content area', async ({ appPage }) => {
    await expect(appPage.page.locator('.app-main')).toBeVisible();
  });

  test('renders 4 hint cards on welcome screen', async ({ appPage }) => {
    await expect(appPage.hintCards).toHaveCount(4);
  });

  test('opens git actions dropdown with commit push and pr actions', async ({ appPage }) => {
    await appPage.openGitMenu();
    await expect(appPage.gitDropdown).toBeVisible();
    await expect(appPage.gitMenuItems).toHaveCount(3);
    await expect(appPage.gitMenuItems.nth(0)).toContainText('Commit Changes');
    await expect(appPage.gitMenuItems.nth(1)).toContainText('Push Branch');
    await expect(appPage.gitMenuItems.nth(2)).toContainText('Create PR');
  });

  test('shows combined model and effort selector', async ({ appPage }) => {
    await expect(appPage.modelConfigTrigger).toBeVisible();
    await expect(appPage.modelConfigTrigger).toContainText('Sonnet');
    await expect(appPage.modelConfigTrigger).toContainText('High');
  });

  test('opens model config dropdown with models and thinking levels', async ({ appPage }) => {
    await appPage.modelConfigTrigger.click();
    await expect(appPage.modelConfigDropdown).toBeVisible();
    await expect(appPage.modelConfigDropdown).toContainText('Opus (Latest)');
    await expect(appPage.modelConfigDropdown).toContainText('Sonnet (Latest)');
    await expect(appPage.modelConfigDropdown).toContainText('Haiku (Latest)');
    await expect(appPage.modelConfigDropdown).toContainText('Low');
    await expect(appPage.modelConfigDropdown).toContainText('High');
  });

  test('shows session stats panel on click', async ({ appPage }) => {
    await appPage.sessionStatsTrigger.click();
    await expect(appPage.sessionStatsPanel).toBeVisible();
    await expect(appPage.sessionStatsPanel).toContainText('Input');
    await expect(appPage.sessionStatsPanel).toContainText('Output');
    await expect(appPage.sessionStatsPanel).toContainText('Cost');
  });
});
