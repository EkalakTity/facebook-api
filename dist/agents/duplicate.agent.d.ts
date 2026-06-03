import { RawPost } from '../types/post.types';
export interface DuplicateResult {
    isDuplicate: boolean;
    reason?: string;
}
export declare function checkDuplicate(accountId: number, _targetId: number, post: RawPost): DuplicateResult;
export interface FilterResult {
    newPosts: RawPost[];
    skipped: number;
    skipReasons: Record<string, number>;
}
export declare function filterNewPosts(accountId: number, targetId: number, posts: RawPost[]): FilterResult;
