import { Page, Locator } from '@playwright/test';

export class AppPage {
  readonly page: Page;
  readonly welcomeTitle: Locator;
  readonly welcomeSubtitle: Locator;
  readonly hintCards: Locator;
  readonly titleBarLogo: Locator;
  readonly titleBarActions: Locator;
  readonly titleGlassCluster: Locator;
  readonly titleChips: Locator;
  readonly contextChip: Locator;
  readonly agentChip: Locator;
  readonly gitMenuTrigger: Locator;
  readonly gitDropdown: Locator;
  readonly gitMenuItems: Locator;
  readonly activityBar: Locator;
  readonly sidebar: Locator;
  readonly appBody: Locator;
  readonly boundaryToggle: Locator;

  constructor(page: Page) {
    this.page = page;
    this.welcomeTitle = page.locator('.welcome-title');
    this.welcomeSubtitle = page.locator('.welcome-subtitle');
    this.hintCards = page.locator('.hint-card');
    this.titleBarLogo = page.locator('.title-bar-logo');
    this.titleBarActions = page.locator('.title-bar-actions');
    this.titleGlassCluster = page.locator('.title-glass-cluster');
    this.titleChips = page.locator('.title-chip');
    this.contextChip = page.locator('.context-chip');
    this.agentChip = page.locator('.agent-chip');
    this.gitMenuTrigger = page.locator('.git-pill-trigger');
    this.gitDropdown = page.locator('.git-dropdown');
    this.gitMenuItems = page.locator('.git-menu-item');
    this.activityBar = page.locator('.activity-bar');
    this.sidebar = page.locator('.sidebar');
    this.appBody = page.locator('.app-body');
    this.boundaryToggle = page.locator('.sidebar-boundary-toggle');
  }

  async goto() {
    await this.page.goto('/');
  }

  activeMode() {
    return this.page.locator('.context-chip .title-chip-text');
  }

  modeBadge() {
    return this.page.locator('.mode-badge');
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
