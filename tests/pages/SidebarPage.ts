import { Page, Locator } from '@playwright/test';

export class SidebarPage {
  readonly page: Page;
  readonly sessionItems: Locator;
  readonly projectGroups: Locator;
  readonly projectHeaders: Locator;
  readonly searchInput: Locator;
  readonly emptyState: Locator;
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
    this.projectGroups = page.locator('.project-group');
    this.projectHeaders = page.locator('.project-header');
    this.sessionItems = page.locator('.session-row');
    this.searchInput = page.locator('.sidebar-search input');
    this.emptyState = page.locator('.empty-state');
    this.settingsBtn = page.getByRole('button', { name: 'Open settings' });
    this.sessionsBtn = page.locator('.activity-bar-top').getByRole('button', { name: /conversations/i });
    this.settingsPanel = page.locator('.settings-panel');
    this.settingsInput = page.locator('.settings-input');
    this.settingsTabs = page.locator('.settings-tab');
    this.settingsContent = page.locator('.settings-content');
    this.settingsSelect = page.locator('.settings-select').first();
    this.shortcutRows = page.locator('.shortcut-row');
    this.addFolderBtn = page.getByRole('button', { name: '添加文件夹' });
  }

  async createSession() {
    // Hover the first project header to reveal the new session button
    const header = this.projectHeaders.first();
    await header.hover();
    await this.page.getByRole('button', { name: '在此文件夹新建会话' }).first().click();
  }

  async createSessionViaShortcut() {
    await this.page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', ctrlKey: true, bubbles: true }));
    });
  }

  async renameSession(index: number, name: string) {
    await this.sessionItems.nth(index).dblclick();
    const renameInput = this.page.locator('.session-rename-input');
    await renameInput.fill(name);
    await renameInput.press('Enter');
  }

  async deleteSession(index: number) {
    await this.revealDeleteConfirm(index);
    await this.sessionItems.nth(index).locator('.session-confirm-archive').click();
  }

  async revealDeleteConfirm(index: number) {
    await this.sessionItems.nth(index).hover();
    await this.sessionItems.nth(index).locator('.session-archive').click();
  }

  sessionDeleteConfirm(index: number) {
    return this.sessionItems.nth(index).locator('.session-confirm-archive');
  }

  async searchSessions(query: string) {
    await this.searchInput.fill(query);
  }

  sessionName(index: number) {
    return this.sessionItems.nth(index).locator('.session-title');
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
