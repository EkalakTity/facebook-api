import chalk from 'chalk'
import { logRepo, LogEntry } from '../db/repositories/log.repo'
import { askSelect } from './prompt'

const levelColor: Record<string, (s: string) => string> = {
  INFO:  chalk.cyan,
  WARN:  chalk.yellow,
  ERROR: chalk.red,
  DEBUG: chalk.gray,
}

function formatEntry(entry: LogEntry): string {
  const ts   = entry.created_at.replace('T', ' ').split('.')[0]
  const lvl  = (entry.level.toUpperCase()).padEnd(5)
  const col  = levelColor[entry.level.toUpperCase()] ?? chalk.white
  const data = entry.data ? chalk.gray(' ' + entry.data.slice(0, 80)) : ''
  return `${chalk.gray(ts)} ${col(lvl)} ${entry.message}${data}`
}

export async function showLogViewer(): Promise<void> {
  const jobs = logRepo.getJobList(8)

  if (jobs.length === 0) {
    console.log(chalk.gray('\nยังไม่มี Log'))
    return
  }

  type Choice = string | 'recent'
  const choices: { name: string; value: Choice }[] = [
    { name: '50 รายการล่าสุด (ทุก Job)', value: 'recent' },
    ...jobs.map((j) => ({
      name: `${j.job_id}  ${chalk.gray(j.created_at.split('T')[0])}`,
      value: j.job_id as Choice,
    })),
  ]

  const picked = await askSelect<Choice>('เลือก Job ที่ต้องการดู Log:', choices)

  const entries: LogEntry[] =
    picked === 'recent'
      ? logRepo.getRecent(50).reverse()
      : logRepo.getByJob(picked)

  console.log()
  console.log(chalk.bold(`── Log: ${picked} (${entries.length} รายการ) ────`))
  console.log()

  entries.forEach((e) => console.log(formatEntry(e)))
  console.log()
}
