import { Page, Locator } from '@playwright/test';

export class AppPage {
  readonly page: Page;
  readonly welcomeTitle: Locator;
  readonly welcomeSubtitle: Locator;
  readonly hintCards: Locator;
  readonly titleBarLogo: Locator;
  readonly modeSwitcher: Locator;
  readonly modeButtons: Locator;
  readonly activityBar: Locator;
  readonly sidebar: Locator;
  readonly appBody: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeTitle = page.locator('.welcome-title');
    this.welcomeSubtitle = page.locator('.welcome-subtitle');
    this.hintCards = page.locator('.hint-card');
    this.titleBarLogo = page.locator('.title-bar-logo');
    this.modeSwitcher = page.locator('.mode-switcher');
    this.modeButtons = page.locator('.mode-btn');
    this.activityBar = page.locator('.activity-bar');
    this.sidebar = page.locator('.sidebar');
    this.appBody = page.locator('.app-body');
  }

  async goto() {
    await this.page.goto('/');
  }

  activeMode() {
    return this.page.locator('.mode-btn.active');
  }

  modeBadge() {
    return this.page.locator('.mode-badge');
  }

  async switchMode(mode: 'Chat' | 'Code' | 'Plan') {
    await this.modeButtons.filter({ hasText: mode }).click();
  }

  async toggleSidebar() {
    await this.page.keyboard.press('Control+b');
  }

  breadcrumb() {
    return this.page.locator('.title-bar-breadcrumb');
  }
}
