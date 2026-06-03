import { reviewQueueRepo, QueueItem } from '../db/repositories/review-queue.repo'
import { scannedPostRepo } from '../db/repositories/scanned-post.repo'
import { processedPostRepo } from '../db/repositories/processed-post.repo'
import { NewScannedPost } from '../types/post.types'

// เพิ่มโพสต์เข้า Queue (save scanned_post → add to queue → update status)
export function enqueuePost(data: NewScannedPost, messageText: string | null): QueueItem {
  const scanned = scannedPostRepo.save(data)
  const queueItem = reviewQueueRepo.addToQueue(scanned.id, messageText)
  scannedPostRepo.updateStatus(scanned.id, 'queued')
  return queueItem
}

// Step 11: Mark as Done
export function markAsDone(item: QueueItem): void {
  reviewQueueRepo.updateStatus(item.id, 'done')
  scannedPostRepo.updateStatus(item.scanned_post_id, 'done')
  processedPostRepo.save({
    account_id: item.account_id,
    target_id: item.target_id,
    post_id: item.post_id,
    post_url: item.post_url,
    action_type: 'comment',
    message_used: item.message_text,
    status: 'done',
  })
}

// Step 11: Reject
export function rejectPost(item: QueueItem): void {
  reviewQueueRepo.updateStatus(item.id, 'rejected')
  scannedPostRepo.updateStatus(item.scanned_post_id, 'rejected')
  processedPostRepo.save({
    account_id: item.account_id,
    target_id: item.target_id,
    post_id: item.post_id,
    post_url: item.post_url,
    action_type: 'rejected',
    status: 'rejected',
  })
}

export function getQueueSummary(): { pending: number; done: number; rejected: number } {
  const rows = db_summary()
  const summary = { pending: 0, done: 0, rejected: 0 }
  for (const row of rows) {
    if (row.status in summary) {
      summary[row.status as keyof typeof summary] = row.count
    }
  }
  return summary
}

import { db } from '../db/database'

function db_summary(): { status: string; count: number }[] {
  return db
    .prepare(`SELECT status, COUNT(*) as count FROM review_queue GROUP BY status`)
    .all() as { status: string; count: number }[]
}
