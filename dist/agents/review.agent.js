"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.enqueuePost = enqueuePost;
exports.markAsDone = markAsDone;
exports.rejectPost = rejectPost;
exports.getQueueSummary = getQueueSummary;
const review_queue_repo_1 = require("../db/repositories/review-queue.repo");
const scanned_post_repo_1 = require("../db/repositories/scanned-post.repo");
const processed_post_repo_1 = require("../db/repositories/processed-post.repo");
// เพิ่มโพสต์เข้า Queue (save scanned_post → add to queue → update status)
function enqueuePost(data, messageText) {
    const scanned = scanned_post_repo_1.scannedPostRepo.save(data);
    const queueItem = review_queue_repo_1.reviewQueueRepo.addToQueue(scanned.id, messageText);
    scanned_post_repo_1.scannedPostRepo.updateStatus(scanned.id, 'queued');
    return queueItem;
}
// Step 11: Mark as Done
function markAsDone(item) {
    review_queue_repo_1.reviewQueueRepo.updateStatus(item.id, 'done');
    scanned_post_repo_1.scannedPostRepo.updateStatus(item.scanned_post_id, 'done');
    processed_post_repo_1.processedPostRepo.save({
        account_id: item.account_id,
        target_id: item.target_id,
        post_id: item.post_id,
        post_url: item.post_url,
        action_type: 'comment',
        message_used: item.message_text,
        status: 'done',
    });
}
// Step 11: Reject
function rejectPost(item) {
    review_queue_repo_1.reviewQueueRepo.updateStatus(item.id, 'rejected');
    scanned_post_repo_1.scannedPostRepo.updateStatus(item.scanned_post_id, 'rejected');
    processed_post_repo_1.processedPostRepo.save({
        account_id: item.account_id,
        target_id: item.target_id,
        post_id: item.post_id,
        post_url: item.post_url,
        action_type: 'rejected',
        status: 'rejected',
    });
}
function getQueueSummary() {
    const rows = db_summary();
    const summary = { pending: 0, done: 0, rejected: 0 };
    for (const row of rows) {
        if (row.status in summary) {
            summary[row.status] = row.count;
        }
    }
    return summary;
}
const database_1 = require("../db/database");
function db_summary() {
    return database_1.db
        .prepare(`SELECT status, COUNT(*) as count FROM review_queue GROUP BY status`)
        .all();
}
//# sourceMappingURL=review.agent.js.map