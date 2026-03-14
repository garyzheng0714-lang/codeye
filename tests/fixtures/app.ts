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
  appPage: async ({ page }, fixtureDone) => {
    const appPage = new AppPage(page);
    await appPage.goto();
    await fixtureDone(appPage);
  },
  sidebarPage: async ({ appPage }, fixtureDone) => {
    const sidebarPage = new SidebarPage(appPage.page);
    await fixtureDone(sidebarPage);
  },
  chatPage: async ({ appPage }, fixtureDone) => {
    const chatPage = new ChatPage(appPage.page);
    await fixtureDone(chatPage);
  },
});

export { expect } from '@playwright/test';
