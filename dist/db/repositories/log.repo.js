"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logRepo = void 0;
const database_1 = require("../database");
exports.logRepo = {
    save(jobId, level, message, data) {
        database_1.db.prepare(`
      INSERT INTO logs (job_id, level, message, data)
      VALUES (?, ?, ?, ?)
    `).run(jobId, level, message, data !== undefined ? JSON.stringify(data) : null);
    },
    getByJob(jobId) {
        return database_1.db
            .prepare('SELECT * FROM logs WHERE job_id = ? ORDER BY created_at ASC')
            .all(jobId);
    },
    getRecent(limit = 50) {
        return database_1.db
            .prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?')
            .all(limit);
    },
    countEventsByJob(jobId) {
        const rows = database_1.db
            .prepare(`SELECT message, COUNT(*) as count FROM logs WHERE job_id = ? GROUP BY message`)
            .all(jobId);
        return Object.fromEntries(rows.map((r) => [r.message, r.count]));
    },
    getJobList(limit = 10) {
        return database_1.db
            .prepare(`
        SELECT job_id, MIN(created_at) as created_at
        FROM logs
        GROUP BY job_id
        ORDER BY created_at DESC
        LIMIT ?
      `)
            .all(limit);
    },
};
//# sourceMappingURL=log.repo.js.map