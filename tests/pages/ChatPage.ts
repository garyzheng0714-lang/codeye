import { Page, Locator } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  readonly textarea: Locator;
  readonly sendBtn: Locator;
  readonly userMessages: Locator;
  readonly userBubbles: Locator;
  readonly slashPalette: Locator;
  readonly slashItems: Locator;
  readonly slashCategories: Locator;
  readonly modelSelector: Locator;
  readonly modelDropdown: Locator;
  readonly modelOptions: Locator;

  constructor(page: Page) {
    this.page = page;
    this.textarea = page.locator('.input-textarea');
    this.sendBtn = page.locator('.send-btn');
    this.userMessages = page.locator('.user-message-row');
    this.userBubbles = page.locator('.user-bubble');
    this.slashPalette = page.locator('.slash-palette');
    this.slashItems = page.locator('.slash-palette-item');
    this.slashCategories = page.locator('.slash-palette-category');
    this.modelSelector = page.locator('.model-selector');
    this.modelDropdown = page.locator('.model-selector-dropdown');
    this.modelOptions = page.locator('.model-option');
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

  async openModelSelector() {
    await this.page.locator('.model-selector-trigger').click();
  }

  async selectModel(label: string) {
    await this.openModelSelector();
    await this.modelOptions.filter({ hasText: label }).click();
  }

  currentModelLabel() {
    return this.page.locator('.model-selector-label');
  }
}
