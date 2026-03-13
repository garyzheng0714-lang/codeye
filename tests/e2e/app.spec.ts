import { test, expect } from '../fixtures/app';

test.describe('App Launch', () => {
  test('renders the welcome screen with Codeye title', async ({ appPage }) => {
    await expect(appPage.welcomeTitle).toHaveText('Codeye');
  });

  test('renders title bar with logo and mode switcher', async ({ appPage }) => {
    await expect(appPage.titleBarLogo).toBeVisible();
    await expect(appPage.modeSwitcher).toBeVisible();
    await expect(appPage.modeButtons).toHaveCount(3);
    await expect(appPage.modeButtons.nth(0)).toHaveText('Chat');
    await expect(appPage.modeButtons.nth(1)).toHaveText('Code');
    await expect(appPage.modeButtons.nth(2)).toHaveText('Plan');
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
});

test.describe('Mode Switching', () => {
  test('can switch between Chat, Code, and Plan modes', async ({ appPage }) => {
    await expect(appPage.activeMode()).toHaveText('Code');

    await appPage.switchMode('Chat');
    await expect(appPage.activeMode()).toHaveText('Chat');
    await expect(appPage.welcomeSubtitle).toContainText('questions');

    await appPage.switchMode('Plan');
    await expect(appPage.activeMode()).toHaveText('Plan');
    await expect(appPage.welcomeSubtitle).toContainText('Plan');
  });
});
