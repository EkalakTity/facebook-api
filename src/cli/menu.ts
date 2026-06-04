import chalk from 'chalk'
import { db } from '../db/database'
import { closeBrowser } from '../agents/session.agent'
import { askSelect } from './prompt'
import { runNewJobSetup } from './new-job.flow'
import { showReviewQueue } from './review-queue.view'
import { showLogViewer } from './log-viewer.view'
import { showGroupJoinView } from './group-join.view'

type MenuChoice = 'new_job' | 'review_queue' | 'join_group' | 'logs' | 'exit'

function getPendingCount(): number {
  const row = db
    .prepare(`SELECT COUNT(*) as count FROM review_queue WHERE status = 'pending'`)
    .get() as { count: number }
  return row.count
}

function printHeader() {
  console.clear()
  console.log(chalk.bold.blue('╔══════════════════════════════════════╗'))
  console.log(chalk.bold.blue('║') + chalk.bold('  Facebook Personal Agent  v1.0.0     ') + chalk.bold.blue('║'))
  console.log(chalk.bold.blue('╚══════════════════════════════════════╝'))
  console.log()
}

async function handleNewJob(): Promise<void> {
  console.log(chalk.bold('\n── เริ่มงานใหม่ ──────────────────────\n'))
  await runNewJobSetup()
  await pause()
}

export async function showMainMenu(): Promise<void> {
  while (true) {
    printHeader()

    const pending = getPendingCount()
    const queueLabel = pending > 0
      ? `ดู Review Queue ${chalk.yellow(`[${pending} รอการทำ]`)}`
      : 'ดู Review Queue'

    const choice = await askSelect<MenuChoice>('เลือกการทำงาน:', [
      { name: 'เริ่มงานใหม่',                          value: 'new_job' },
      { name: queueLabel,                               value: 'review_queue' },
      { name: 'ขอเข้ากลุ่ม Facebook',                  value: 'join_group' },
      { name: 'ดู Log ล่าสุด',                          value: 'logs' },
      { name: chalk.gray('ออกจากโปรแกรม'),              value: 'exit' },
    ])

    console.log()

    switch (choice) {
      case 'new_job':
        await handleNewJob()
        break

      case 'review_queue':
        await showReviewQueue()
        await pause()
        break

      case 'join_group':
        await showGroupJoinView()
        await pause()
        break

      case 'logs':
        await showLogViewer()
        await pause()
        break

      case 'exit':
        await closeBrowser()
        console.log(chalk.gray('ออกจากโปรแกรม...'))
        process.exit(0)
    }
  }
}

function pause(): Promise<void> {
  return new Promise((resolve) => {
    process.stdout.write(chalk.gray('\nกด Enter เพื่อกลับเมนูหลัก...'))
    process.stdin.once('data', () => resolve())
  })
}
