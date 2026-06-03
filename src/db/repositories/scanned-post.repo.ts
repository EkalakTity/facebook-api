import { db } from '../database'
import { ScannedPost, NewScannedPost } from '../../types/post.types'

export const scannedPostRepo = {
  save(data: NewScannedPost): ScannedPost {
    const result = db
      .prepare(`
        INSERT INTO scanned_posts
          (platform, account_id, target_id, post_id, post_url, post_text, author_name)
        VALUES
          ('facebook', ?, ?, ?, ?, ?, ?)
      `)
      .run(
        data.account_id,
        data.target_id,
        data.post_id ?? null,
        data.post_url,
        data.post_text ?? null,
        data.author_name ?? null,
      )

    return db
      .prepare('SELECT * FROM scanned_posts WHERE id = ?')
      .get(result.lastInsertRowid) as ScannedPost
  },

  findByUrl(postUrl: string): ScannedPost | null {
    return db
      .prepare('SELECT * FROM scanned_posts WHERE post_url = ? LIMIT 1')
      .get(postUrl) as ScannedPost | null
  },

  findByPostId(postId: string): ScannedPost | null {
    return db
      .prepare('SELECT * FROM scanned_posts WHERE post_id = ? LIMIT 1')
      .get(postId) as ScannedPost | null
  },

  updateStatus(id: number, status: string): void {
    db.prepare('UPDATE scanned_posts SET status = ? WHERE id = ?').run(status, id)
  },
}
