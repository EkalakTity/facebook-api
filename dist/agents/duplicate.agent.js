"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDuplicate = checkDuplicate;
exports.filterNewPosts = filterNewPosts;
const database_1 = require("../db/database");
const processed_post_repo_1 = require("../db/repositories/processed-post.repo");
// เช็กว่าโพสต์นี้อยู่ใน review_queue (pending) แล้วหรือยัง
function isAlreadyInQueue(accountId, postUrl, postId) {
    const byUrl = database_1.db
        .prepare(`
      SELECT rq.id FROM review_queue rq
      JOIN scanned_posts sp ON rq.scanned_post_id = sp.id
      WHERE sp.account_id = ? AND sp.post_url = ? AND rq.status = 'pending'
      LIMIT 1
    `)
        .get(accountId, postUrl);
    if (byUrl)
        return true;
    if (postId) {
        const byId = database_1.db
            .prepare(`
        SELECT rq.id FROM review_queue rq
        JOIN scanned_posts sp ON rq.scanned_post_id = sp.id
        WHERE sp.account_id = ? AND sp.post_id = ? AND rq.status = 'pending'
        LIMIT 1
      `)
            .get(accountId, postId);
        if (byId)
            return true;
    }
    return false;
}
function checkDuplicate(accountId, _targetId, post) {
    // 1. เคยทำแล้ว (done / rejected)
    if (processed_post_repo_1.processedPostRepo.isPostProcessed(accountId, post.postUrl)) {
        return { isDuplicate: true, reason: 'already_processed' };
    }
    if (post.postId && processed_post_repo_1.processedPostRepo.isPostProcessedById(accountId, post.postId)) {
        return { isDuplicate: true, reason: 'already_processed' };
    }
    // 2. รออยู่ใน Queue แล้ว
    if (isAlreadyInQueue(accountId, post.postUrl, post.postId)) {
        return { isDuplicate: true, reason: 'already_in_queue' };
    }
    return { isDuplicate: false };
}
function filterNewPosts(accountId, targetId, posts) {
    const newPosts = [];
    const skipReasons = {};
    let skipped = 0;
    for (const post of posts) {
        const { isDuplicate, reason } = checkDuplicate(accountId, targetId, post);
        if (isDuplicate && reason) {
            skipped++;
            skipReasons[reason] = (skipReasons[reason] ?? 0) + 1;
        }
        else {
            newPosts.push(post);
        }
    }
    return { newPosts, skipped, skipReasons };
}
//# sourceMappingURL=duplicate.agent.js.map