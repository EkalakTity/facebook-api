import { db } from '../database'
import { Target, NewTarget } from '../../types/target.types'

export const targetRepo = {
  create(data: NewTarget): Target {
    const result = db
      .prepare(`
        INSERT INTO targets (account_id, platform, target_type, target_name, target_url)
        VALUES (?, 'facebook', ?, ?, ?)
      `)
      .run(data.account_id, data.target_type, data.target_name ?? null, data.target_url)

    return db
      .prepare('SELECT * FROM targets WHERE id = ?')
      .get(result.lastInsertRowid) as Target
  },

  getById(id: number): Target | null {
    return db
      .prepare('SELECT * FROM targets WHERE id = ?')
      .get(id) as Target | null
  },

  // ดึงทั้งหมด เรียงจากใหม่สุด
  getAll(): Target[] {
    return db
      .prepare('SELECT * FROM targets ORDER BY created_at DESC')
      .all() as Target[]
  },

  findByUrl(url: string): Target | null {
    return db
      .prepare('SELECT * FROM targets WHERE target_url = ? LIMIT 1')
      .get(url) as Target | null
  },
}
