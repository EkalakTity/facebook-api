import { db } from '../database'
import { Account } from '../../types/account.types'

export const accountRepo = {
  findByProfilePath(profilePath: string): Account | null {
    return db
      .prepare('SELECT * FROM accounts WHERE profile_path = ? LIMIT 1')
      .get(profilePath) as Account | null
  },

  create(profilePath: string, name = 'My Facebook Account'): Account {
    const result = db
      .prepare(`
        INSERT INTO accounts (account_name, profile_path, platform, status)
        VALUES (?, ?, 'facebook', 'active')
      `)
      .run(name, profilePath)

    return db
      .prepare('SELECT * FROM accounts WHERE id = ?')
      .get(result.lastInsertRowid) as Account
  },

  // หา account จาก profile path ถ้าไม่มีให้สร้างใหม่
  findOrCreate(profilePath: string): Account {
    return this.findByProfilePath(profilePath) ?? this.create(profilePath)
  },

  getById(id: number): Account | null {
    return db
      .prepare('SELECT * FROM accounts WHERE id = ?')
      .get(id) as Account | null
  },
}
