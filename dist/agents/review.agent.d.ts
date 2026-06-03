import { QueueItem } from '../db/repositories/review-queue.repo';
import { NewScannedPost } from '../types/post.types';
export declare function enqueuePost(data: NewScannedPost, messageText: string | null): QueueItem;
export declare function markAsDone(item: QueueItem): void;
export declare function rejectPost(item: QueueItem): void;
export declare function getQueueSummary(): {
    pending: number;
    done: number;
    rejected: number;
};
