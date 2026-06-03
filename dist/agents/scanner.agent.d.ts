import { Page } from 'playwright';
import { RawPost, ScanConfig } from '../types/post.types';
export declare function navigateToTarget(page: Page, url: string): Promise<void>;
export declare function scanVisiblePosts(page: Page): Promise<RawPost[]>;
export declare function runScanRound(page: Page, targetUrl: string, config: ScanConfig): Promise<RawPost[]>;
