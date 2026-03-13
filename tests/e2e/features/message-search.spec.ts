import { test, expect } from '../../fixtures/app';

test.describe('Message Search', () => {
  test('Ctrl+F opens the message search bar', async ({ chatPage }) => {
    await chatPage.openMessageSearch();
    await expect(chatPage.messageSearchBar).toBeVisible();
    await expect(chatPage.messageSearchInput).toBeFocused();
  });

  test('search bar shows placeholder text', async ({ chatPage }) => {
    await chatPage.openMessageSearch();
    await expect(chatPage.messageSearchInput).toHaveAttribute('placeholder', 'Search messages...');
  });

  test('close button closes the search bar', async ({ chatPage }) => {
    await chatPage.openMessageSearch();
    await expect(chatPage.messageSearchBar).toBeVisible();
    await chatPage.closeMessageSearch();
    await expect(chatPage.messageSearchBar).not.toBeVisible();
  });

  test('Escape closes the search bar', async ({ chatPage, page }) => {
    await chatPage.openMessageSearch();
    await expect(chatPage.messageSearchBar).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(chatPage.messageSearchBar).not.toBeVisible();
  });

  test('Ctrl+F toggles search bar on and off', async ({ chatPage }) => {
    await chatPage.openMessageSearch();
    await expect(chatPage.messageSearchBar).toBeVisible();
    await chatPage.openMessageSearch();
    await expect(chatPage.messageSearchBar).not.toBeVisible();
  });

  test('empty search shows no count', async ({ chatPage }) => {
    await chatPage.openMessageSearch();
    await expect(chatPage.messageSearchCount).toHaveText('');
  });

  test('search with no messages shows 0 found', async ({ chatPage }) => {
    await chatPage.openMessageSearch();
    await chatPage.messageSearchInput.fill('test query');
    await expect(chatPage.messageSearchCount).toHaveText('0 found');
  });

  test('search results not visible when no matches', async ({ chatPage }) => {
    await chatPage.openMessageSearch();
    await chatPage.messageSearchInput.fill('nonexistent query');
    await expect(chatPage.messageSearchResults).not.toBeVisible();
  });
});
