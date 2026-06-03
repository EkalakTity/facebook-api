import chalk from 'chalk'
import { JobSummary } from '../agents/logger.agent'

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec} วินาที`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s > 0 ? `${m} นาที ${s} วินาที` : `${m} นาที`
}

function fmtTime(iso: string): string {
  return iso.replace('T', ' ').split('.')[0]
}

function bar(count: number, total: number, width = 20): string {
  if (total === 0) return chalk.gray('░'.repeat(width))
  const filled = Math.round((count / total) * width)
  return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(width - filled))
}

export function showSummary(summary: JobSummary): void {
  const { totalFound, duplicates, queued, done, rejected, errors, durationSec } = summary

  console.log()
  console.log(chalk.bold.blue('╔══════════════════════════════════════════╗'))
  console.log(chalk.bold.blue('║') + chalk.bold('  📊 สรุปผลการทำงาน                       ') + chalk.bold.blue('║'))
  console.log(chalk.bold.blue('╚══════════════════════════════════════════╝'))
  console.log()
  console.log(chalk.gray(`Job ID  : ${summary.jobId}`))
  console.log(chalk.gray(`เริ่ม   : ${fmtTime(summary.startedAt)}`))
  console.log(chalk.gray(`จบ      : ${fmtTime(summary.endedAt)}`))
  console.log(chalk.gray(`ใช้เวลา : ${fmtDuration(durationSec)}`))
  console.log()
  console.log(chalk.bold('── โพสต์ ─────────────────────────────────'))
  console.log(`  พบทั้งหมด   : ${chalk.white(totalFound)}`)
  console.log(`  ใหม่         : ${chalk.green(queued)}`)
  console.log(`  ซ้ำ (Skip)   : ${chalk.gray(duplicates)}`)
  console.log()
  console.log(chalk.bold('── Review Queue ──────────────────────────'))
  if (queued > 0) {
    console.log(`  ${bar(done,     queued)} Done     ${chalk.green(done)} / ${queued}`)
    console.log(`  ${bar(rejected, queued)} Rejected ${chalk.red(rejected)} / ${queued}`)
    const pending = queued - done - rejected
    if (pending > 0) {
      console.log(`  ${bar(pending, queued)} รอ Review ${chalk.yellow(pending)} / ${queued}`)
    }
  } else {
    console.log(chalk.gray('  (ไม่มีโพสต์เข้า Queue)'))
  }

  if (errors > 0) {
    console.log()
    console.log(`  ${chalk.red('⚠')} Error : ${chalk.red(errors)} ครั้ง`)
  }

  console.log()
}
