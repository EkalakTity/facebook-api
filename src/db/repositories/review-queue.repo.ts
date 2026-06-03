import { db } from '../database'

export interface QueueItem {
  id: number
  scanned_post_id: number
  message_text: string | null
  status: string
  created_at: string
  // joined from scanned_posts
  post_url: string
  post_id: string | null
  post_text: string | null
  author_name: string | null
  account_id: number
  target_id: number
}

export const reviewQueueRepo = {
  addToQueue(scannedPostId: number, messageText: string | null = null): QueueItem {
    const result = db
      .prepare(`
        INSERT INTO review_queue (scanned_post_id, message_text, status)
        VALUES (?, ?, 'pending')
      `)
      .run(scannedPostId, messageText)

    return this.getById(result.lastInsertRowid as number)!
  },

  getById(id: number): QueueItem | null {
    return db
      .prepare(`
        SELECT rq.id, rq.scanned_post_id, rq.message_text, rq.status, rq.created_at,
               sp.post_url, sp.post_id, sp.post_text, sp.author_name,
               sp.account_id, sp.target_id
        FROM review_queue rq
        JOIN scanned_posts sp ON rq.scanned_post_id = sp.id
        WHERE rq.id = ?
      `)
      .get(id) as QueueItem | null
  },

  getPendingQueue(): QueueItem[] {
    return db
      .prepare(`
        SELECT rq.id, rq.scanned_post_id, rq.message_text, rq.status, rq.created_at,
               sp.post_url, sp.post_id, sp.post_text, sp.author_name,
               sp.account_id, sp.target_id
        FROM review_queue rq
        JOIN scanned_posts sp ON rq.scanned_post_id = sp.id
        WHERE rq.status = 'pending'
        ORDER BY rq.created_at ASC
      `)
      .all() as QueueItem[]
  },

  updateStatus(id: number, status: string): void {
    db.prepare(`
      UPDATE review_queue
      SET status = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, id)
  },

  getQueueCount(): number {
    const row = db
      .prepare(`SELECT COUNT(*) as count FROM review_queue WHERE status = 'pending'`)
      .get() as { count: number }
    return row.count
  },
}
