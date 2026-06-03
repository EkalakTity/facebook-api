import { ScannedPost, NewScannedPost } from '../../types/post.types';
export declare const scannedPostRepo: {
    save(data: NewScannedPost): ScannedPost;
    findByUrl(postUrl: string): ScannedPost | null;
    findByPostId(postId: string): ScannedPost | null;
    updateStatus(id: number, status: string): void;
};
