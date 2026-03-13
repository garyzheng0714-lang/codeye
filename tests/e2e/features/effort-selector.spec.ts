import { test, expect } from '../../fixtures/app';

test.describe('Effort/Thinking Level Selector', () => {
  test('shows default effort level High', async ({ chatPage }) => {
    await expect(chatPage.currentEffortLabel()).toHaveText('High');
  });

  test('dropdown shows Thinking section with effort levels', async ({ chatPage }) => {
    await chatPage.openConfigSelector();
    await expect(chatPage.configDropdown).toBeVisible();
    await expect(chatPage.configDropdown).toContainText('Thinking');
    await expect(chatPage.configDropdown).toContainText('Low');
    await expect(chatPage.configDropdown).toContainText('Medium');
    await expect(chatPage.configDropdown).toContainText('High');
    await expect(chatPage.configDropdown).not.toContainText('Max');
  });

  test('selecting Low effort updates trigger label', async ({ chatPage }) => {
    await chatPage.selectEffort('Low');
    await expect(chatPage.currentEffortLabel()).toHaveText('Low');
  });

  test('selecting Medium effort updates trigger label', async ({ chatPage }) => {
    await chatPage.selectEffort('Medium');
    await expect(chatPage.currentEffortLabel()).toHaveText('Med');
  });

  test('effort persists after changing model', async ({ chatPage }) => {
    await chatPage.selectEffort('High');
    await expect(chatPage.currentEffortLabel()).toHaveText('High');
    await chatPage.selectModel('Opus');
    await expect(chatPage.currentEffortLabel()).toHaveText('High');
    await expect(chatPage.currentModelLabel()).toHaveText('Opus');
  });

  test('slash command /think-low switches effort', async ({ chatPage }) => {
    await chatPage.selectSlashCommand('think-low');
    await expect(chatPage.currentEffortLabel()).toHaveText('Low');
  });

  test('slash command /think-high switches effort', async ({ chatPage }) => {
    await chatPage.selectSlashCommand('think-high');
    await expect(chatPage.currentEffortLabel()).toHaveText('High');
  });

  test('haiku disables thinking controls', async ({ chatPage }) => {
    await chatPage.selectModel('Haiku');
    await expect(chatPage.currentEffortLabel()).toHaveText('N/A');
    await chatPage.openConfigSelector();
    await expect(chatPage.configDropdown).toContainText('Thinking controls are not available for this model.');
  });

  test('dropdown has two config sections (Model + Thinking)', async ({ chatPage }) => {
    await chatPage.openConfigSelector();
    await expect(chatPage.configSections).toHaveCount(2);
    await expect(chatPage.configSections.nth(0)).toContainText('Model');
    await expect(chatPage.configSections.nth(1)).toContainText('Thinking');
  });
});
