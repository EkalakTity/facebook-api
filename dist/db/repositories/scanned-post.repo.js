"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scannedPostRepo = void 0;
const database_1 = require("../database");
exports.scannedPostRepo = {
    save(data) {
        const result = database_1.db
            .prepare(`
        INSERT INTO scanned_posts
          (platform, account_id, target_id, post_id, post_url, post_text, author_name)
        VALUES
          ('facebook', ?, ?, ?, ?, ?, ?)
      `)
            .run(data.account_id, data.target_id, data.post_id ?? null, data.post_url, data.post_text ?? null, data.author_name ?? null);
        return database_1.db
            .prepare('SELECT * FROM scanned_posts WHERE id = ?')
            .get(result.lastInsertRowid);
    },
    findByUrl(postUrl) {
        return database_1.db
            .prepare('SELECT * FROM scanned_posts WHERE post_url = ? LIMIT 1')
            .get(postUrl);
    },
    findByPostId(postId) {
        return database_1.db
            .prepare('SELECT * FROM scanned_posts WHERE post_id = ? LIMIT 1')
            .get(postId);
    },
    updateStatus(id, status) {
        database_1.db.prepare('UPDATE scanned_posts SET status = ? WHERE id = ?').run(status, id);
    },
};
//# sourceMappingURL=scanned-post.repo.js.map