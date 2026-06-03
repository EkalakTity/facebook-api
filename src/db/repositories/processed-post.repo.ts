import { db } from '../database'

export interface ProcessedPost {
  id: number
  platform: string
  account_id: number
  target_id: number | null
  post_id: string | null
  post_url: string
  action_type: string | null
  message_used: string | null
  status: string
  created_at: string
}

export interface NewProcessedPost {
  account_id: number
  target_id?: number | null
  post_id?: string | null
  post_url: string
  action_type?: string
  message_used?: string | null
  status: 'done' | 'rejected'
}

export const processedPostRepo = {
  isPostProcessed(accountId: number, postUrl: string): boolean {
    const row = db
      .prepare(`
        SELECT id FROM processed_posts
        WHERE account_id = ? AND post_url = ?
        LIMIT 1
      `)
      .get(accountId, postUrl)
    return !!row
  },

  isPostProcessedById(accountId: number, postId: string): boolean {
    const row = db
      .prepare(`
        SELECT id FROM processed_posts
        WHERE account_id = ? AND post_id = ?
        LIMIT 1
      `)
      .get(accountId, postId)
    return !!row
  },

  getProcessedPost(accountId: number, postUrl: string): ProcessedPost | null {
    return db
      .prepare(`
        SELECT * FROM processed_posts
        WHERE account_id = ? AND post_url = ?
        LIMIT 1
      `)
      .get(accountId, postUrl) as ProcessedPost | null
  },

  save(data: NewProcessedPost): ProcessedPost {
    const result = db
      .prepare(`
        INSERT INTO processed_posts
          (platform, account_id, target_id, post_id, post_url, action_type, message_used, status)
        VALUES
          ('facebook', ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        data.account_id,
        data.target_id ?? null,
        data.post_id ?? null,
        data.post_url,
        data.action_type ?? null,
        data.message_used ?? null,
        data.status,
      )

    return db
      .prepare('SELECT * FROM processed_posts WHERE id = ?')
      .get(result.lastInsertRowid) as ProcessedPost
  },
}
