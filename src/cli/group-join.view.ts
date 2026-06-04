import chalk from 'chalk'
import path from 'path'
import { BrowserContext, Page } from 'playwright'
import { launchBrowser, closeBrowser, checkSession, getContext } from '../agents/session.agent'
import { askText, askSelect, askConfirm } from './prompt'
import { browserConfig } from '../config/browser.config'
import { searchGroupByName, requestJoinGroup } from '../agents/group-join.agent'
import { groupRepo } from '../db/repositories/group.repo'
import { GroupSearchResult, GroupJoinStatus } from '../types/group.types'

type MainChoice = 'search' | 'history' | 'exit'

async function ensureBrowserPage(): Promise<{ page: Page; opened: boolean } | null> {
  let ctx: BrowserContext
  let opened = false

  try {
    ctx = getContext()
  } catch {
    const profilePath = browserConfig.profilePath ?? await (async () => {
      console.log(chalk.yellow('ไม่พบ BROWSER_PROFILE_PATH ใน .env'))
      const input = await askText('ใส่ path ของ Browser Profile:')
      return path.resolve(input.trim())
    })()

    console.log(chalk.gray('\nกำลังเปิด Browser...'))
    ctx = await launchBrowser(profilePath)
    opened = true
  }

  const page = await ctx.newPage()

  if (opened) {
    console.log(chalk.gray('กำลังตรวจสอบ Session...'))
    const loggedIn = await checkSession(page)
    if (!loggedIn) {
      await page.close()
      await closeBrowser()
      console.log(chalk.red('✗ Session หมดอายุ กรุณา Login Facebook ก่อน'))
      return null
    }
    console.log(chalk.green('✓ Login แล้ว'))
  }

  return { page, opened }
}

function printSearchResults(results: GroupSearchResult[]): void {
  console.log()
  results.forEach((r, i) => {
    const privacy = r.privacy ? chalk.gray(`[${r.privacy}]`) : ''
    const members = r.memberCount ? chalk.gray(`  ${r.memberCount} สมาชิก`) : ''
    console.log(`  ${chalk.bold(String(i + 1).padStart(2))}. ${chalk.white(r.name)} ${privacy}${members}`)
  })
  console.log()
}

function statusLabel(status: GroupJoinStatus): string {
  switch (status) {
    case 'request_sent':   return chalk.yellow('รอ Approve')
    case 'joined':         return chalk.green('เข้าร่วมแล้ว')
    case 'already_member': return chalk.blue('เป็นสมาชิกอยู่แล้ว')
    case 'failed':         return chalk.red('ไม่สำเร็จ')
  }
}

async function runSearchAndJoin(page: Page): Promise<void> {
  const query = (await askText('ใส่ชื่อกลุ่มที่ต้องการค้นหา:')).trim()
  if (!query) return

  console.log(chalk.gray('\nกำลังค้นหา...'))
  const results = await searchGroupByName(page, query)

  if (results.length === 0) {
    console.log(chalk.yellow('ไม่พบกลุ่มที่ตรงกัน ลองค้นหาด้วยคำอื่น'))
    return
  }

  printSearchResults(results)

  type PickChoice = number | 'back'
  const choices: { name: string; value: PickChoice }[] = [
    ...results.map((r, i) => ({
      name: `${i + 1}. ${r.name}${r.memberCount ? `  (${r.memberCount} สมาชิก)` : ''}`,
      value: i as PickChoice,
    })),
    { name: chalk.gray('← กลับ'), value: 'back' },
  ]

  const picked = await askSelect<PickChoice>('เลือกกลุ่มที่ต้องการขอเข้าร่วม:', choices)
  if (picked === 'back') return

  const selected = results[picked as number]

  if (groupRepo.isAlreadyRequested(selected.url)) {
    const existing = groupRepo.findByUrl(selected.url)
    console.log(chalk.yellow(`\n⚠ เคยขอเข้ากลุ่ม "${selected.name}" แล้ว [${statusLabel(existing!.status)}]`))
    const proceed = await askConfirm('ต้องการขอเข้าอีกครั้ง?', false)
    if (!proceed) return
  }

  console.log(chalk.gray(`\nกำลังเปิดหน้ากลุ่ม "${selected.name}"...`))
  const status = await requestJoinGroup(page, selected.url)

  switch (status) {
    case 'request_sent':
      console.log(chalk.green(`✓ ส่งคำขอเข้ากลุ่ม "${selected.name}" แล้ว (รอ Approve)`))
      break
    case 'joined':
      console.log(chalk.green(`✓ เข้าร่วมกลุ่ม "${selected.name}" สำเร็จ`))
      break
    case 'already_member':
      console.log(chalk.yellow(`⚠ เป็นสมาชิกกลุ่ม "${selected.name}" อยู่แล้ว`))
      break
    case 'failed':
      console.log(chalk.red(`✗ ไม่พบปุ่ม Join ในกลุ่ม "${selected.name}"`))
      break
  }

  groupRepo.save({ group_name: selected.name, group_url: selected.url, status })
}

function showHistory(): void {
  const history = groupRepo.getAll()

  if (history.length === 0) {
    console.log(chalk.gray('\nยังไม่มีประวัติการขอเข้ากลุ่ม'))
    return
  }

  console.log(chalk.bold(`\n── ประวัติการขอเข้ากลุ่ม (${history.length} รายการ) ───────────`))
  history.slice(0, 20).forEach((r, i) => {
    console.log(
      `  ${String(i + 1).padStart(2)}. ${chalk.white(r.group_name)}  ${statusLabel(r.status)}`,
    )
    console.log(`      ${chalk.gray(r.group_url)}  ${chalk.gray(r.requested_at)}`)
  })
  console.log()
}

export async function showGroupJoinView(): Promise<void> {
  const session = await ensureBrowserPage()
  if (!session) return

  const { page, opened } = session

  try {
    while (true) {
      console.log(chalk.bold.blue('\n── ขอเข้ากลุ่ม Facebook ──────────────────'))

      const choice = await askSelect<MainChoice>('เลือกการทำงาน:', [
        { name: '🔍 ค้นหากลุ่มและขอเข้าร่วม',       value: 'search' },
        { name: '📋 ดูประวัติการขอเข้ากลุ่ม',        value: 'history' },
        { name: chalk.gray('← กลับเมนูหลัก'),         value: 'exit' },
      ])

      if (choice === 'exit') break

      if (choice === 'history') {
        showHistory()
        continue
      }

      await runSearchAndJoin(page)

      const again = await askConfirm('\nต้องการขอเข้ากลุ่มอื่นอีกหรือไม่?', true)
      if (!again) break
    }
  } finally {
    await page.close().catch(() => {})
    if (opened) await closeBrowser()
  }
}
