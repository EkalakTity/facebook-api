export interface RawPost {
    postUrl: string;
    postId: string | null;
    postText: string | null;
    authorName: string | null;
    foundAt: string;
}
export interface ScannedPost {
    id: number;
    platform: string;
    account_id: number;
    target_id: number;
    post_id: string | null;
    post_url: string;
    post_text: string | null;
    author_name: string | null;
    found_at: string;
    status: string;
}
export interface NewScannedPost {
    account_id: number;
    target_id: number;
    post_id?: string | null;
    post_url: string;
    post_text?: string | null;
    author_name?: string | null;
}
export interface ScanConfig {
    scrollPerRound: number;
    cooldownMs: number;
    maxPostsPerRound: number;
}
