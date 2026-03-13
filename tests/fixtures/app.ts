import { test as base } from '@playwright/test';
import { AppPage } from '../pages/AppPage';
import { SidebarPage } from '../pages/SidebarPage';
import { ChatPage } from '../pages/ChatPage';

type AppFixtures = {
  appPage: AppPage;
  sidebarPage: SidebarPage;
  chatPage: ChatPage;
};

export const test = base.extend<AppFixtures>({
  appPage: async ({ page }, use) => {
    const appPage = new AppPage(page);
    await appPage.goto();
    await use(appPage);
  },
  sidebarPage: async ({ appPage }, use) => {
    const sidebarPage = new SidebarPage(appPage.page);
    await use(sidebarPage);
  },
  chatPage: async ({ appPage }, use) => {
    const chatPage = new ChatPage(appPage.page);
    await use(chatPage);
  },
});

export { expect } from '@playwright/test';
