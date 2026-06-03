import { BrowserContext, Page } from 'playwright';
export declare function launchBrowser(profilePath?: string): Promise<BrowserContext>;
export declare function closeBrowser(): Promise<void>;
export declare function getContext(): BrowserContext;
export declare function checkSession(page: Page): Promise<boolean>;
