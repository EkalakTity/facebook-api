import Database, { Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import fs from 'fs'

const DB_PATH = path.join(process.cwd(), 'data', 'agent.db')

const BOOTSTRAP_SQL = `
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL DEFAULT 'facebook',
    account_name TEXT NOT NULL,
    profile_path TEXT,
    cookie_path TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS targets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL DEFAULT 'facebook',
    account_id INTEGER NOT NULL,
    target_type TEXT NOT NULL,
    target_name TEXT,
    target_url TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS message_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    text TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS scanned_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL DEFAULT 'facebook',
    account_id INTEGER NOT NULL,
    target_id INTEGER NOT NULL,
    post_id TEXT,
    post_url TEXT NOT NULL,
    post_text TEXT,
    author_name TEXT,
    found_at TEXT NOT NULL DEFAULT (datetime('now')),
    status TEXT NOT NULL DEFAULT 'new'
  );
  CREATE TABLE IF NOT EXISTS review_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scanned_post_id INTEGER NOT NULL,
    message_template_id INTEGER,
    message_text TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS processed_posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    platform TEXT NOT NULL DEFAULT 'facebook',
    account_id INTEGER NOT NULL,
    target_id INTEGER,
    post_id TEXT,
    post_url TEXT NOT NULL,
    action_type TEXT,
    message_used TEXT,
    status TEXT NOT NULL DEFAULT 'done',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    data TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
  CREATE INDEX IF NOT EXISTS idx_scanned_posts_url ON scanned_posts(post_url);
  CREATE INDEX IF NOT EXISTS idx_processed_posts_account ON processed_posts(account_id, post_url);
  CREATE TABLE IF NOT EXISTS group_join_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name   TEXT    NOT NULL,
    group_url    TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'request_sent',
    requested_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_group_join_url ON group_join_history(group_url);
`

declare const globalThis: { _agentDb?: DatabaseType } & typeof global

function openDb(): DatabaseType {
  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  const db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  db.exec(BOOTSTRAP_SQL)
  return db
}

if (!globalThis._agentDb) {
  globalThis._agentDb = openDb()
}

export const db = globalThis._agentDb!
