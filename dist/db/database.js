"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
require("dotenv/config");
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const dbPath = process.env.DB_PATH || './data/agent.db';
// สร้างโฟลเดอร์ data/ ถ้ายังไม่มี
const dir = path_1.default.dirname(dbPath);
if (!fs_1.default.existsSync(dir)) {
    fs_1.default.mkdirSync(dir, { recursive: true });
}
exports.db = new better_sqlite3_1.default(dbPath);
// เปิด WAL mode เพื่อประสิทธิภาพที่ดีขึ้น
exports.db.pragma('journal_mode = WAL');
exports.db.pragma('foreign_keys = ON');
//# sourceMappingURL=database.js.map