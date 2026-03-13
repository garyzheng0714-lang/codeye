import { Page, Locator } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  readonly textarea: Locator;
  readonly sendBtn: Locator;
  readonly stopBtn: Locator;
  readonly userMessages: Locator;
  readonly userBubbles: Locator;
  readonly slashPalette: Locator;
  readonly slashItems: Locator;
  readonly slashCategories: Locator;
  readonly configSelector: Locator;
  readonly configDropdown: Locator;
  readonly configOptions: Locator;
  readonly configSections: Locator;
  readonly effortLabel: Locator;
  readonly messageSearchBar: Locator;
  readonly messageSearchInput: Locator;
  readonly messageSearchCount: Locator;
  readonly messageSearchClose: Locator;
  readonly messageSearchResults: Locator;

  constructor(page: Page) {
    this.page = page;
    this.textarea = page.locator('.input-textarea');
    this.sendBtn = page.locator('.send-btn');
    this.stopBtn = page.locator('.stop-btn');
    this.userMessages = page.locator('.user-message-row');
    this.userBubbles = page.locator('.user-bubble');
    this.slashPalette = page.locator('.slash-palette');
    this.slashItems = page.locator('.slash-palette-item');
    this.slashCategories = page.locator('.slash-palette-category');
    this.configSelector = page.locator('.config-selector');
    this.configDropdown = page.locator('.config-selector-dropdown');
    this.configOptions = page.locator('.config-option');
    this.configSections = page.locator('.config-section');
    this.effortLabel = page.locator('.config-selector-effort');
    this.messageSearchBar = page.locator('.message-search');
    this.messageSearchInput = page.locator('.message-search-input');
    this.messageSearchCount = page.locator('.message-search-count');
    this.messageSearchClose = page.locator('.message-search-close');
    this.messageSearchResults = page.locator('.message-search-results');
  }

  async focusInput() {
    await this.textarea.click();
  }

  async typeSlowly(text: string) {
    await this.textarea.pressSequentially(text);
  }

  async focusViaShortcut() {
    await this.page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', ctrlKey: true, bubbles: true }));
    });
  }

  async openSlashPalette() {
    await this.focusInput();
    await this.typeSlowly('/');
  }

  async selectSlashCommand(query: string) {
    await this.focusInput();
    await this.typeSlowly(`/${query}`);
    await this.page.keyboard.press('Enter');
  }

  activeSlashItem() {
    return this.page.locator('.slash-palette-item.active');
  }

  async openConfigSelector() {
    await this.page.locator('.config-selector-trigger').click();
  }

  async selectModel(label: string) {
    await this.openConfigSelector();
    await this.configOptions.filter({ hasText: label }).click();
    await this.page.keyboard.press('Escape');
  }

  currentModelLabel() {
    return this.page.locator('.config-selector-model');
  }

  currentEffortLabel() {
    return this.page.locator('.config-selector-effort');
  }

  async selectEffort(label: string) {
    await this.openConfigSelector();
    // Effort options are in the second config-section (Thinking)
    const thinkingSection = this.configSections.nth(1);
    await thinkingSection.locator('.config-option', { hasText: label }).click();
    await this.page.keyboard.press('Escape');
  }

  async openMessageSearch() {
    await this.page.evaluate(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }));
    });
  }

  async closeMessageSearch() {
    await this.messageSearchClose.click();
  }
}
