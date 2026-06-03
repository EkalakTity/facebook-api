export interface ProcessedPost {
    id: number;
    platform: string;
    account_id: number;
    target_id: number | null;
    post_id: string | null;
    post_url: string;
    action_type: string | null;
    message_used: string | null;
    status: string;
    created_at: string;
}
export interface NewProcessedPost {
    account_id: number;
    target_id?: number | null;
    post_id?: string | null;
    post_url: string;
    action_type?: string;
    message_used?: string | null;
    status: 'done' | 'rejected';
}
export declare const processedPostRepo: {
    isPostProcessed(accountId: number, postUrl: string): boolean;
    isPostProcessedById(accountId: number, postId: string): boolean;
    getProcessedPost(accountId: number, postUrl: string): ProcessedPost | null;
    save(data: NewProcessedPost): ProcessedPost;
};
