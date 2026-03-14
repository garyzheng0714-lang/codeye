import { Page, Locator } from '@playwright/test';

export class SidebarPage {
  readonly page: Page;
  readonly sessionItems: Locator;
  readonly folderSections: Locator;
  readonly folderHeaders: Locator;
  readonly searchInput: Locator;
  readonly emptyState: Locator;
  readonly folderEmptyState: Locator;
  readonly settingsBtn: Locator;
  readonly sessionsBtn: Locator;
  readonly settingsPanel: Locator;
  readonly settingsInput: Locator;
  readonly settingsTabs: Locator;
  readonly settingsContent: Locator;
  readonly settingsSelect: Locator;
  readonly shortcutRows: Locator;
  readonly addFolderBtn: Locator;

  constructor(page: Page) {
    this.page = page;
    this.folderSections = page.locator('.folder-section');
    this.folderHeaders = page.locator('.folder-header');
    this.sessionItems = page.locator('.session-item');
    this.searchInput = page.locator('.sidebar-search input');
    this.emptyState = page.locator('.empty-state');
    this.folderEmptyState = page.locator('.folder-empty');
    this.settingsBtn = page.getByRole('button', { name: 'Open settings' });
    this.sessionsBtn = page.locator('.activity-bar-top').getByRole('button', { name: /conversations/i });
    this.settingsPanel = page.locator('.settings-panel');
    this.settingsInput = page.locator('.settings-input');
    this.settingsTabs = page.locator('.settings-tab');
    this.settingsContent = page.locator('.settings-content');
    this.settingsSelect = page.locator('.settings-select').first();
    this.shortcutRows = page.locator('.shortcut-row');
    this.addFolderBtn = page.getByRole('button', { name: 'Add Folder' });
  }

  async createSession() {
    const folderCount = await this.folderSections.count();
    if (folderCount === 0) {
      await this.addFolderBtn.click();
      await this.folderHeaders.first().waitFor({ state: 'visible' });
    }
    await this.folderHeaders.first().hover();
    const newBtn = this.page.locator('.folder-new-session').first();
    await newBtn.click();
  }

  async createSessionViaShortcut() {
    await this.page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true }));
    });
  }

  async renameSession(index: number, name: string) {
    await this.sessionItems.nth(index).locator('.session-item-content').dblclick();
    const renameInput = this.page.locator('.session-rename-input');
    await renameInput.fill(name);
    await renameInput.press('Enter');
  }

  async deleteSession(index: number) {
    await this.revealDeleteConfirm(index);
    await this.sessionItems.nth(index).locator('.session-confirm-delete').click();
  }

  async revealDeleteConfirm(index: number) {
    await this.sessionItems.nth(index).hover();
    await this.sessionItems.nth(index).locator('.session-delete').click();
  }

  sessionDeleteConfirm(index: number) {
    return this.sessionItems.nth(index).locator('.session-confirm-delete');
  }

  async searchSessions(query: string) {
    await this.searchInput.fill(query);
  }

  sessionName(index: number) {
    return this.sessionItems.nth(index).locator('.session-name');
  }

  async openSettings() {
    await this.settingsBtn.click();
  }

  async openSessions() {
    await this.sessionsBtn.click();
  }

  async setWorkingDirectory(path: string) {
    await this.settingsInput.fill(path);
    await this.settingsInput.press('Enter');
  }

  async switchSettingsTab(label: string) {
    await this.settingsTabs.filter({ hasText: label }).click();
  }

  activeSettingsTab() {
    return this.page.locator('.settings-tab.active');
  }
}
