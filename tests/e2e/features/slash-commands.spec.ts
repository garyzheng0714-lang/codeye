import { test, expect } from '../../fixtures/app';

test.describe('Slash Command Palette', () => {
  test('typing / opens the command palette with 3 categories', async ({ chatPage }) => {
    await chatPage.openSlashPalette();
    await expect(chatPage.slashPalette).toBeVisible();
    await expect(chatPage.slashCategories).toHaveCount(4);
  });

  test('typing filters commands to exact match', async ({ chatPage }) => {
    await chatPage.focusInput();
    await chatPage.typeSlowly('/tdd');
    await expect(chatPage.slashItems).toHaveCount(1);
    await expect(chatPage.slashItems.first()).toContainText('/tdd');
  });

  test('typing non-matching query shows no palette', async ({ chatPage }) => {
    await chatPage.focusInput();
    await chatPage.typeSlowly('/xyznotreal');
    await expect(chatPage.slashPalette).not.toBeVisible();
  });

  test('Escape closes the palette', async ({ chatPage, page }) => {
    await chatPage.openSlashPalette();
    await expect(chatPage.slashPalette).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(chatPage.slashPalette).not.toBeVisible();
  });

  test('selecting a mode command switches mode', async ({ appPage, chatPage }) => {
    await chatPage.selectSlashCommand('chat');
    await expect(chatPage.slashPalette).not.toBeVisible();
    await expect(appPage.modeBadge()).toContainText('chat');
  });

  test('arrow keys navigate items', async ({ chatPage, page }) => {
    await chatPage.openSlashPalette();
    await expect(chatPage.activeSlashItem()).toContainText('/chat');
    await page.keyboard.press('ArrowDown');
    await expect(chatPage.activeSlashItem()).toContainText('/code');
    await page.keyboard.press('ArrowDown');
    await expect(chatPage.activeSlashItem()).toContainText('/plan');
  });

  test('palette hides when input does not start with /', async ({ chatPage }) => {
    await chatPage.focusInput();
    await chatPage.typeSlowly('hello');
    await expect(chatPage.slashPalette).not.toBeVisible();
  });

  test('description-based search finds commands', async ({ chatPage }) => {
    await chatPage.focusInput();
    await chatPage.typeSlowly('/vulnerabilit');
    await expect(chatPage.slashItems).toHaveCount(1);
    await expect(chatPage.slashItems.first()).toContainText('/security-scan');
  });
});
