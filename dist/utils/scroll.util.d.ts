import { Page } from 'playwright';
export declare function scrollDown(page: Page, times: number, delayMs?: number): Promise<void>;
export declare function waitRandom(minMs: number, maxMs: number): Promise<void>;
