import { test, expect } from '../../fixtures/app';

test.describe('Input Area', () => {
  test('input area is present with textarea and send button', async ({ chatPage }) => {
    await expect(chatPage.textarea).toBeVisible();
    await expect(chatPage.sendBtn).toBeVisible();
  });

  test('send button is disabled when input is empty', async ({ chatPage }) => {
    await expect(chatPage.sendBtn).toBeDisabled();
  });

  test('send button is enabled when input has text', async ({ chatPage }) => {
    await chatPage.textarea.fill('Hello');
    await expect(chatPage.sendBtn).toBeEnabled();
  });

  test('Ctrl+L focuses the input via simulated shortcut', async ({ appPage, chatPage }) => {
    await appPage.welcomeTitle.click();
    await chatPage.focusViaShortcut();
    await expect(chatPage.textarea).toBeFocused();
  });

  test('Ctrl+/ opens slash commands via simulated shortcut', async ({ chatPage, page }) => {
    await chatPage.focusInput();
    await page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: '/', ctrlKey: true, bubbles: true }));
    });
    await expect(chatPage.textarea).toBeFocused();
    await expect(chatPage.textarea).toHaveValue('/');
    await expect(chatPage.slashPalette).toBeVisible();
  });

  test('textarea auto-resizes on multi-line input', async ({ chatPage }) => {
    const initialHeight = await chatPage.textarea.evaluate((el) => el.offsetHeight);
    await chatPage.textarea.fill('Line 1\nLine 2\nLine 3\nLine 4');
    const expandedHeight = await chatPage.textarea.evaluate((el) => el.offsetHeight);

    expect(expandedHeight).toBeGreaterThan(initialHeight);
  });
});

test.describe('Settings Panel', () => {
  test('can navigate to settings and see version', async ({ sidebarPage }) => {
    await sidebarPage.openSettings();
    await expect(sidebarPage.settingsPanel).toBeVisible();
    await expect(sidebarPage.settingsContent).toContainText('Codeye v');
  });
});
