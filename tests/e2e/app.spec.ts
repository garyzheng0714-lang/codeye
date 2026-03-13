import { test, expect } from '../fixtures/app';

test.describe('App Launch', () => {
  test('renders the welcome screen with Codeye title', async ({ appPage }) => {
    await expect(appPage.welcomeTitle).toHaveText('Codeye');
  });

  test('renders title bar with logo and control cluster', async ({ appPage }) => {
    await expect(appPage.titleBarLogo).toBeVisible();
    await expect(appPage.titleBarActions).toBeVisible();
    await expect(appPage.titleGlassCluster).toBeVisible();
    await expect(appPage.titleChips).toHaveCount(3);
    await expect(appPage.contextChip).toContainText('Code');
    await expect(appPage.agentChip).toContainText('Sonnet');
    await expect(appPage.gitMenuTrigger).toContainText('Submit');
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

  test('shows current mode in the context pill', async ({ appPage }) => {
    await expect(appPage.activeMode()).toHaveText('Code');
  });
});
