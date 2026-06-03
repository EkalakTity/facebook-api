"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountRepo = void 0;
const database_1 = require("../database");
exports.accountRepo = {
    findByProfilePath(profilePath) {
        return database_1.db
            .prepare('SELECT * FROM accounts WHERE profile_path = ? LIMIT 1')
            .get(profilePath);
    },
    create(profilePath, name = 'My Facebook Account') {
        const result = database_1.db
            .prepare(`
        INSERT INTO accounts (account_name, profile_path, platform, status)
        VALUES (?, ?, 'facebook', 'active')
      `)
            .run(name, profilePath);
        return database_1.db
            .prepare('SELECT * FROM accounts WHERE id = ?')
            .get(result.lastInsertRowid);
    },
    // หา account จาก profile path ถ้าไม่มีให้สร้างใหม่
    findOrCreate(profilePath) {
        return this.findByProfilePath(profilePath) ?? this.create(profilePath);
    },
    getById(id) {
        return database_1.db
            .prepare('SELECT * FROM accounts WHERE id = ?')
            .get(id);
    },
};
//# sourceMappingURL=account.repo.js.map