import { db } from '../database'
import { GroupJoinRecord, GroupJoinStatus, NewGroupJoinRecord } from '../../types/group.types'

db.exec(`
  CREATE TABLE IF NOT EXISTS group_join_history (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    group_name   TEXT    NOT NULL,
    group_url    TEXT    NOT NULL,
    status       TEXT    NOT NULL DEFAULT 'request_sent',
    requested_at TEXT    NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_group_join_url ON group_join_history(group_url);
`)

export const groupRepo = {
  save(data: NewGroupJoinRecord): GroupJoinRecord {
    const result = db
      .prepare('INSERT INTO group_join_history (group_name, group_url, status) VALUES (?, ?, ?)')
      .run(data.group_name, data.group_url, data.status)
    return db
      .prepare('SELECT * FROM group_join_history WHERE id = ?')
      .get(result.lastInsertRowid) as GroupJoinRecord
  },

  updateStatus(id: number, status: GroupJoinStatus): void {
    db.prepare('UPDATE group_join_history SET status = ? WHERE id = ?').run(status, id)
  },

  findByUrl(url: string): GroupJoinRecord | null {
    return db
      .prepare('SELECT * FROM group_join_history WHERE group_url = ? LIMIT 1')
      .get(url) as GroupJoinRecord | null
  },

  isAlreadyRequested(groupUrl: string): boolean {
    return this.findByUrl(groupUrl) != null
  },

  getAll(): GroupJoinRecord[] {
    return db
      .prepare('SELECT * FROM group_join_history ORDER BY requested_at DESC')
      .all() as GroupJoinRecord[]
  },
}
