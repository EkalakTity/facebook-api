import { db } from '../db/database'
import { processedPostRepo } from '../db/repositories/processed-post.repo'
import { RawPost } from '../types/post.types'

export interface DuplicateResult {
  isDuplicate: boolean
  reason?: string
}

// เช็กว่าโพสต์นี้อยู่ใน review_queue (pending) แล้วหรือยัง
function isAlreadyInQueue(accountId: number, postUrl: string, postId: string | null): boolean {
  const byUrl = db
    .prepare(`
      SELECT rq.id FROM review_queue rq
      JOIN scanned_posts sp ON rq.scanned_post_id = sp.id
      WHERE sp.account_id = ? AND sp.post_url = ? AND rq.status = 'pending'
      LIMIT 1
    `)
    .get(accountId, postUrl)

  if (byUrl) return true

  if (postId) {
    const byId = db
      .prepare(`
        SELECT rq.id FROM review_queue rq
        JOIN scanned_posts sp ON rq.scanned_post_id = sp.id
        WHERE sp.account_id = ? AND sp.post_id = ? AND rq.status = 'pending'
        LIMIT 1
      `)
      .get(accountId, postId)

    if (byId) return true
  }

  return false
}

export function checkDuplicate(
  accountId: number,
  _targetId: number,
  post: RawPost,
): DuplicateResult {
  // 1. เคยทำแล้ว (done / rejected)
  if (processedPostRepo.isPostProcessed(accountId, post.postUrl)) {
    return { isDuplicate: true, reason: 'already_processed' }
  }

  if (post.postId && processedPostRepo.isPostProcessedById(accountId, post.postId)) {
    return { isDuplicate: true, reason: 'already_processed' }
  }

  // 2. รออยู่ใน Queue แล้ว
  if (isAlreadyInQueue(accountId, post.postUrl, post.postId)) {
    return { isDuplicate: true, reason: 'already_in_queue' }
  }

  return { isDuplicate: false }
}

export interface FilterResult {
  newPosts: RawPost[]
  skipped: number
  skipReasons: Record<string, number>
}

export function filterNewPosts(
  accountId: number,
  targetId: number,
  posts: RawPost[],
): FilterResult {
  const newPosts: RawPost[] = []
  const skipReasons: Record<string, number> = {}
  let skipped = 0

  for (const post of posts) {
    const { isDuplicate, reason } = checkDuplicate(accountId, targetId, post)

    if (isDuplicate && reason) {
      skipped++
      skipReasons[reason] = (skipReasons[reason] ?? 0) + 1
    } else {
      newPosts.push(post)
    }
  }

  return { newPosts, skipped, skipReasons }
}
