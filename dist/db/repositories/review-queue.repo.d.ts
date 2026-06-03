export interface QueueItem {
    id: number;
    scanned_post_id: number;
    message_text: string | null;
    status: string;
    created_at: string;
    post_url: string;
    post_id: string | null;
    post_text: string | null;
    author_name: string | null;
    account_id: number;
    target_id: number;
}
export declare const reviewQueueRepo: {
    addToQueue(scannedPostId: number, messageText?: string | null): QueueItem;
    getById(id: number): QueueItem | null;
    getPendingQueue(): QueueItem[];
    updateStatus(id: number, status: string): void;
    getQueueCount(): number;
};
