import { Page, Locator } from '@playwright/test';

export class AppPage {
  readonly page: Page;
  readonly welcomeTitle: Locator;
  readonly welcomeSubtitle: Locator;
  readonly hintCards: Locator;
  readonly titleBarActions: Locator;
  readonly gitMenuTrigger: Locator;
  readonly gitDropdown: Locator;
  readonly gitMenuItems: Locator;
  readonly activityBar: Locator;
  readonly sidebar: Locator;
  readonly appBody: Locator;
  readonly boundaryToggle: Locator;
  readonly modelConfigTrigger: Locator;
  readonly modelConfigDropdown: Locator;
  readonly sessionStatsTrigger: Locator;
  readonly sessionStatsPanel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeTitle = page.locator('.welcome-title');
    this.welcomeSubtitle = page.locator('.welcome-subtitle');
    this.hintCards = page.locator('.hint-card');
    this.titleBarActions = page.locator('.title-bar-actions');
    this.gitMenuTrigger = page.locator('.git-split-chevron');
    this.gitDropdown = page.locator('.git-dropdown');
    this.gitMenuItems = page.locator('.git-menu-item');
    this.activityBar = page.locator('.activity-bar');
    this.sidebar = page.locator('.sidebar');
    this.appBody = page.locator('.app-body');
    this.boundaryToggle = page.locator('.sidebar-boundary-toggle');
    this.modelConfigTrigger = page.locator('.config-selector-trigger');
    this.modelConfigDropdown = page.locator('.config-selector-dropdown');
    this.sessionStatsTrigger = page.locator('.session-stats-trigger');
    this.sessionStatsPanel = page.locator('.session-stats-panel');
  }

  async goto() {
    await this.page.goto('/');
  }

  async openGitMenu() {
    await this.gitMenuTrigger.click();
  }

  async toggleSidebar() {
    await this.page.keyboard.press('Control+b');
  }

  breadcrumb() {
    return this.page.locator('.title-bar-breadcrumb');
  }
}
