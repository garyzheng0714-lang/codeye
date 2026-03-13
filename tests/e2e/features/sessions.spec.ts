import { test, expect } from '../../fixtures/app';

test.describe('Session Management', () => {
  test('empty state shows when no folders exist', async ({ sidebarPage }) => {
    await expect(sidebarPage.emptyState).toBeVisible();
    await expect(sidebarPage.emptyState).toContainText('No folders yet');
  });

  test('new session button creates a session', async ({ sidebarPage }) => {
    await sidebarPage.createSession();
    await expect(sidebarPage.folderSections).toHaveCount(1);
    await expect(sidebarPage.sessionItems).toHaveCount(1);
    await expect(sidebarPage.sessionItems.first()).toHaveClass(/active/);
  });

  test('Ctrl+N shortcut creates a session', async ({ sidebarPage }) => {
    await sidebarPage.createSessionViaShortcut();
    await expect(sidebarPage.sessionItems).toHaveCount(1);
  });

  test('clicking hint card creates session and shows user message', async ({ appPage, chatPage, sidebarPage }) => {
    const hintCard = appPage.hintCards.first();
    const hintText = await hintCard.textContent();

    await hintCard.click();

    await expect(chatPage.userMessages).toBeVisible();
    await expect(chatPage.userBubbles).toContainText(hintText!);
    await expect(sidebarPage.sessionItems).toHaveCount(1);
  });

  test('can create multiple sessions and switch between them', async ({ appPage, chatPage, sidebarPage }) => {
    await appPage.hintCards.first().click();
    await expect(sidebarPage.sessionItems).toHaveCount(1);
    await expect(chatPage.userMessages).toBeVisible();

    await sidebarPage.createSession();
    await expect(sidebarPage.sessionItems).toHaveCount(2);
    await expect(appPage.welcomeTitle).toBeVisible();

    // Switch back to first session (newest is first, so older is nth(1))
    await sidebarPage.sessionItems.nth(1).click();
    await expect(chatPage.userMessages).toBeVisible();
  });

  test('can rename session by double-click', async ({ sidebarPage }) => {
    await sidebarPage.createSession();
    await expect(sidebarPage.sessionItems).toHaveCount(1);

    await sidebarPage.renameSession(0, 'My Test Session');
    await expect(sidebarPage.sessionName(0)).toHaveText('My Test Session');
  });

  test('can delete a session', async ({ sidebarPage }) => {
    await sidebarPage.createSession();
    await expect(sidebarPage.sessionItems).toHaveCount(1);

    await sidebarPage.deleteSession(0);
    await expect(sidebarPage.sessionItems).toHaveCount(0);
    await expect(sidebarPage.folderEmptyState).toBeVisible();
  });

  test('delete requires inline confirmation before removing the session', async ({ sidebarPage }) => {
    await sidebarPage.createSession();
    await expect(sidebarPage.sessionItems).toHaveCount(1);

    await sidebarPage.revealDeleteConfirm(0);
    await expect(sidebarPage.sessionDeleteConfirm(0)).toBeVisible();
    await expect(sidebarPage.sessionItems).toHaveCount(1);
  });

  test('search filters sessions', async ({ sidebarPage }) => {
    await sidebarPage.createSession();
    await expect(sidebarPage.sessionItems).toHaveCount(1);
    await sidebarPage.renameSession(0, 'Unique Alpha');

    await sidebarPage.createSession();
    await expect(sidebarPage.sessionItems).toHaveCount(2);

    await sidebarPage.searchSessions('Alpha');
    await expect(sidebarPage.sessionItems).toHaveCount(1);
    await expect(sidebarPage.sessionName(0)).toHaveText('Unique Alpha');
  });
});
