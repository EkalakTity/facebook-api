"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processedPostRepo = void 0;
const database_1 = require("../database");
exports.processedPostRepo = {
    isPostProcessed(accountId, postUrl) {
        const row = database_1.db
            .prepare(`
        SELECT id FROM processed_posts
        WHERE account_id = ? AND post_url = ?
        LIMIT 1
      `)
            .get(accountId, postUrl);
        return !!row;
    },
    isPostProcessedById(accountId, postId) {
        const row = database_1.db
            .prepare(`
        SELECT id FROM processed_posts
        WHERE account_id = ? AND post_id = ?
        LIMIT 1
      `)
            .get(accountId, postId);
        return !!row;
    },
    getProcessedPost(accountId, postUrl) {
        return database_1.db
            .prepare(`
        SELECT * FROM processed_posts
        WHERE account_id = ? AND post_url = ?
        LIMIT 1
      `)
            .get(accountId, postUrl);
    },
    save(data) {
        const result = database_1.db
            .prepare(`
        INSERT INTO processed_posts
          (platform, account_id, target_id, post_id, post_url, action_type, message_used, status)
        VALUES
          ('facebook', ?, ?, ?, ?, ?, ?, ?)
      `)
            .run(data.account_id, data.target_id ?? null, data.post_id ?? null, data.post_url, data.action_type ?? null, data.message_used ?? null, data.status);
        return database_1.db
            .prepare('SELECT * FROM processed_posts WHERE id = ?')
            .get(result.lastInsertRowid);
    },
};
//# sourceMappingURL=processed-post.repo.js.map