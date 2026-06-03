import chalk from 'chalk'
import { exec } from 'child_process'
import { reviewQueueRepo, QueueItem } from '../db/repositories/review-queue.repo'
import { markAsDone, rejectPost } from '../agents/review.agent'
import { askSelect, askConfirm } from './prompt'

type ItemAction = 'open' | 'copy' | 'done' | 'reject' | 'skip' | 'exit'

function shortUrl(url: string): string {
  return url.replace('https://www.facebook.com', 'fb.com').slice(0, 60)
}

function printItem(item: QueueItem, index: number, total: number): void {
  console.log()
  console.log(chalk.bold(`#${index + 1} / ${total}`) + '  ' + chalk.yellow('[pending]') + '  ' + chalk.gray(item.author_name ?? 'ไม่ทราบชื่อ'))
  console.log(chalk.cyan(shortUrl(item.post_url)))

  if (item.post_text) {
    const preview = item.post_text.slice(0, 120).replace(/\n/g, ' ')
    console.log(chalk.gray(`"${preview}${item.post_text.length > 120 ? '...' : ''}"`))
  }

  console.log(chalk.gray('─'.repeat(50)))

  if (item.message_text) {
    console.log('ข้อความ: ' + chalk.white(item.message_text))
  } else {
    console.log(chalk.gray('(ไม่มีข้อความที่เตรียมไว้)'))
  }
  console.log()
}

async function handleItemAction(item: QueueItem): Promise<'next' | 'exit'> {
  const action = await askSelect<ItemAction>('เลือกการทำงาน:', [
    { name: '🔗 เปิด Post ใน Browser',    value: 'open' },
    { name: '📋 แสดงข้อความ (Copy)',       value: 'copy' },
    { name: chalk.green('✓ Mark as Done'), value: 'done' },
    { name: chalk.red('✗ Reject'),         value: 'reject' },
    { name: '→ Skip ไปรายการถัดไป',       value: 'skip' },
    { name: chalk.gray('← กลับเมนูหลัก'), value: 'exit' },
  ])

  switch (action) {
    case 'open':
      exec(`start "" "${item.post_url}"`)
      console.log(chalk.gray(`เปิด: ${item.post_url}`))
      return 'next'

    case 'copy':
      console.log()
      console.log(chalk.bold('── ข้อความ ──────────────────────────────'))
      console.log(chalk.white(item.message_text ?? '(ไม่มีข้อความ)'))
      console.log(chalk.bold('─────────────────────────────────────────'))
      console.log(chalk.gray('(Copy ข้อความด้านบนแล้วไปวางในโพสต์)'))
      return 'next'

    case 'done': {
      const confirm = await askConfirm('ยืนยัน Mark as Done?', true)
      if (confirm) {
        markAsDone(item)
        console.log(chalk.green('✓ บันทึกแล้ว'))
      }
      return 'next'
    }

    case 'reject': {
      const confirm = await askConfirm('ยืนยัน Reject โพสต์นี้?', false)
      if (confirm) {
        rejectPost(item)
        console.log(chalk.red('✗ Rejected'))
      }
      return 'next'
    }

    case 'skip':
      return 'next'

    case 'exit':
      return 'exit'
  }
}

export async function showReviewQueue(): Promise<void> {
  while (true) {
    const queue = reviewQueueRepo.getPendingQueue()

    if (queue.length === 0) {
      console.log(chalk.gray('\nไม่มีรายการที่รอ Review'))
      break
    }

    console.clear()
    console.log(chalk.bold.blue(`📋 Review Queue`) + chalk.yellow(`  (${queue.length} รายการ)`))

    let i = 0
    while (i < queue.length) {
      // โหลดข้อมูลล่าสุดแต่ละรอบ (อาจมีการอัปเดต status)
      const fresh = reviewQueueRepo.getPendingQueue()
      if (i >= fresh.length) break

      const item = fresh[i]

      console.clear()
      console.log(chalk.bold.blue(`📋 Review Queue`) + chalk.yellow(`  (${fresh.length} รายการ)`))
      printItem(item, i, fresh.length)

      const result = await handleItemAction(item)

      if (result === 'exit') return
      // ถ้า done/reject → ไม่เพิ่ม i เพราะรายการถัดไปเลื่อนขึ้นมาเอง
      // ถ้า skip/copy/open → เพิ่ม i
      const isActioned = ['done', 'reject'].includes(
        reviewQueueRepo.getById(item.id)?.status ?? ''
      )
      if (!isActioned) i++
    }

    break
  }

  console.log(chalk.gray('\nQueue ว่างแล้ว หรือทำครบทุกรายการแล้ว'))
}
