"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewQueueRepo = void 0;
const database_1 = require("../database");
exports.reviewQueueRepo = {
    addToQueue(scannedPostId, messageText = null) {
        const result = database_1.db
            .prepare(`
        INSERT INTO review_queue (scanned_post_id, message_text, status)
        VALUES (?, ?, 'pending')
      `)
            .run(scannedPostId, messageText);
        return this.getById(result.lastInsertRowid);
    },
    getById(id) {
        return database_1.db
            .prepare(`
        SELECT rq.id, rq.scanned_post_id, rq.message_text, rq.status, rq.created_at,
               sp.post_url, sp.post_id, sp.post_text, sp.author_name,
               sp.account_id, sp.target_id
        FROM review_queue rq
        JOIN scanned_posts sp ON rq.scanned_post_id = sp.id
        WHERE rq.id = ?
      `)
            .get(id);
    },
    getPendingQueue() {
        return database_1.db
            .prepare(`
        SELECT rq.id, rq.scanned_post_id, rq.message_text, rq.status, rq.created_at,
               sp.post_url, sp.post_id, sp.post_text, sp.author_name,
               sp.account_id, sp.target_id
        FROM review_queue rq
        JOIN scanned_posts sp ON rq.scanned_post_id = sp.id
        WHERE rq.status = 'pending'
        ORDER BY rq.created_at ASC
      `)
            .all();
    },
    updateStatus(id, status) {
        database_1.db.prepare(`
      UPDATE review_queue
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, id);
    },
    getQueueCount() {
        const row = database_1.db
            .prepare(`SELECT COUNT(*) as count FROM review_queue WHERE status = 'pending'`)
            .get();
        return row.count;
    },
};
//# sourceMappingURL=review-queue.repo.js.map