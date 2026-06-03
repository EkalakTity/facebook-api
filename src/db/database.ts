import 'dotenv/config'
import Database, { Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const dbPath = process.env.DB_PATH || './data/agent.db'

// สร้างโฟลเดอร์ data/ ถ้ายังไม่มี
const dir = path.dirname(dbPath)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

export const db: DatabaseType = new Database(dbPath)

// เปิด WAL mode เพื่อประสิทธิภาพที่ดีขึ้น
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
