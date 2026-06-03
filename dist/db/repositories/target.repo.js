"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.targetRepo = void 0;
const database_1 = require("../database");
exports.targetRepo = {
    create(data) {
        const result = database_1.db
            .prepare(`
        INSERT INTO targets (account_id, platform, target_type, target_name, target_url)
        VALUES (?, 'facebook', ?, ?, ?)
      `)
            .run(data.account_id, data.target_type, data.target_name ?? null, data.target_url);
        return database_1.db
            .prepare('SELECT * FROM targets WHERE id = ?')
            .get(result.lastInsertRowid);
    },
    getById(id) {
        return database_1.db
            .prepare('SELECT * FROM targets WHERE id = ?')
            .get(id);
    },
    // ดึงทั้งหมด เรียงจากใหม่สุด
    getAll() {
        return database_1.db
            .prepare('SELECT * FROM targets ORDER BY created_at DESC')
            .all();
    },
    findByUrl(url) {
        return database_1.db
            .prepare('SELECT * FROM targets WHERE target_url = ? LIMIT 1')
            .get(url);
    },
};
//# sourceMappingURL=target.repo.js.map