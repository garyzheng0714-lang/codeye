import { Page, Locator } from '@playwright/test';

export class SidebarPage {
  readonly page: Page;
  readonly newSessionBtn: Locator;
  readonly sessionItems: Locator;
  readonly folderSections: Locator;
  readonly searchInput: Locator;
  readonly emptyState: Locator;
  readonly folderEmptyState: Locator;
  readonly settingsBtn: Locator;
  readonly sessionsBtn: Locator;
  readonly settingsPanel: Locator;
  readonly settingsInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newSessionBtn = page.locator('.new-session-btn');
    this.folderSections = page.locator('.folder-section');
    this.sessionItems = page.locator('.session-item');
    this.searchInput = page.locator('.sidebar-search input');
    this.emptyState = page.locator('.empty-state');
    this.folderEmptyState = page.locator('.folder-empty');
    this.settingsBtn = page.locator('.activity-bar-bottom .activity-btn');
    this.sessionsBtn = page.locator('.activity-bar-top .activity-btn');
    this.settingsPanel = page.locator('.settings-panel');
    this.settingsInput = page.locator('.settings-input');
  }

  async createSession() {
    await this.newSessionBtn.click();
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
}
