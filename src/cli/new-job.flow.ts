import chalk from 'chalk'
import path from 'path'
import { launchBrowser, closeBrowser, checkSession, getContext } from '../agents/session.agent'
import { askText, askSelect, askNumber, askConfirm } from './prompt'
import { browserConfig } from '../config/browser.config'
import { accountRepo } from '../db/repositories/account.repo'
import { selectTarget } from '../agents/target.agent'
import { runScanRound } from '../agents/scanner.agent'
import { filterNewPosts } from '../agents/duplicate.agent'
import { enqueuePost } from '../agents/review.agent'
import { createJob, endJob, logEvent, logError } from '../agents/logger.agent'
import { showSummary } from './summary.view'
import { db } from '../db/database'
import { Target } from '../types/target.types'
import { Account } from '../types/account.types'
import { ScanConfig } from '../types/post.types'

// ── Step 5: Profile Path ──────────────────────────────────────────

async function resolveProfilePath(): Promise<string> {
  if (browserConfig.profilePath) {
    console.log(chalk.gray(`Profile: ${browserConfig.profilePath}`))
    return browserConfig.profilePath
  }
  console.log(chalk.yellow('ไม่พบ BROWSER_PROFILE_PATH ใน .env'))
  const input = await askText('ใส่ path ของ Browser Profile:')
  return path.resolve(input.trim())
}

async function openAndVerifySession(profilePath: string): Promise<boolean> {
  console.log(chalk.gray('\nกำลังเปิด Browser...'))
  const context = await launchBrowser(profilePath)
  const page = await context.newPage()

  console.log(chalk.gray('กำลังตรวจสอบ Session...'))
  const loggedIn = await checkSession(page)

  if (!loggedIn) {
    await closeBrowser()
    console.log(chalk.red('✗ Session หมดอายุหรือยังไม่ได้ Login'))
    console.log(chalk.yellow('  กรุณา Login Facebook ใน Browser Profile ก่อนใช้งาน'))
    return false
  }

  console.log(chalk.green('✓ Login แล้ว พร้อมทำงาน'))
  return true
}

// ── Step 6: Message Template ──────────────────────────────────────

interface Template { id: number; name: string; text: string }

async function selectMessageTemplate(): Promise<Template> {
  const templates = db
    .prepare(`SELECT id, name, text FROM message_templates WHERE status = 'active' ORDER BY id`)
    .all() as Template[]

  if (templates.length === 0) {
    const text = await askText('ไม่มี Template — ใส่ข้อความที่จะใช้:')
    return { id: 0, name: 'custom', text }
  }

  const choices = templates.map((t) => ({ name: `${t.name}: ${t.text}`, value: t }))
  return await askSelect<Template>('เลือกข้อความ:', choices)
}

// ── Working Config ────────────────────────────────────────────────

async function setupConfig(): Promise<{ config: ScanConfig; maxRounds: number }> {
  console.log(chalk.bold('\n── ตั้งค่าการทำงาน ──────────────────────'))
  const maxRounds      = await askNumber('จำนวนรอบ:', 3)
  const scrollPerRound = await askNumber('Scroll ต่อรอบ:', 2)
  const cooldownSec    = await askNumber('Cooldown ระหว่างรอบ (วินาที):', 90)
  const maxPosts       = await askNumber('โพสต์สูงสุดต่อรอบ:', 10)

  return {
    config: { scrollPerRound, cooldownMs: cooldownSec * 1000, maxPostsPerRound: maxPosts },
    maxRounds,
  }
}

// ── Scan Loop ─────────────────────────────────────────────────────

async function runJobLoop(
  account: Account,
  target: Target,
  template: Template,
  config: ScanConfig,
  maxRounds: number,
): Promise<void> {
  const context = getContext()
  const page    = await context.newPage()

  let totalFound = 0
  let totalNew   = 0
  let totalSkip  = 0

  for (let round = 1; round <= maxRounds; round++) {
    console.log(chalk.bold(`\n── รอบที่ ${round} / ${maxRounds} ──────────────────────`))
    logEvent('scan_round_start', { round, of: maxRounds })

    const rawPosts = await runScanRound(page, target.target_url, config)
    const { newPosts, skipped, skipReasons } = filterNewPosts(account.id, target.id, rawPosts)

    totalFound += rawPosts.length
    totalNew   += newPosts.length
    totalSkip  += skipped

    // Log ทุกโพสต์ที่เจอ
    rawPosts.forEach((p) => logEvent('post_found', { url: p.postUrl }))
    if (skipped > 0) logEvent('post_duplicate', { count: skipped, reasons: skipReasons })

    // Enqueue โพสต์ใหม่
    for (const post of newPosts) {
      try {
        enqueuePost(
          {
            account_id:  account.id,
            target_id:   target.id,
            post_id:     post.postId,
            post_url:    post.postUrl,
            post_text:   post.postText,
            author_name: post.authorName,
          },
          template.text,
        )
        logEvent('post_queued', { url: post.postUrl })
      } catch (err) {
        logError('enqueue_error', err)
      }
    }

    console.log(
      chalk.gray(`พบ ${rawPosts.length} โพสต์`) +
      chalk.green(`  ใหม่ ${newPosts.length}`) +
      chalk.gray(`  ซ้ำ ${skipped}`)
    )
    logEvent('scan_round_complete', { round, found: rawPosts.length, new: newPosts.length, skipped })

    if (round < maxRounds) {
      console.log(chalk.gray(`รอ Cooldown...`))
    }
  }

  console.log(chalk.bold(`\n── สรุปการ Scan ─────────────────────────`))
  console.log(`พบทั้งหมด: ${chalk.white(totalFound)}  ใหม่: ${chalk.green(totalNew)}  ซ้ำ: ${chalk.gray(totalSkip)}`)
}

// ── Entry Point ───────────────────────────────────────────────────

export async function runNewJobSetup(): Promise<void> {
  try {
    // Step 5: Session
    const profilePath = await resolveProfilePath()
    if (!profilePath) return

    const ok = await openAndVerifySession(profilePath)
    if (!ok) return

    // Step 6: Account + Target
    const account = accountRepo.findOrCreate(profilePath)
    console.log(chalk.gray(`\nบัญชี: ${account.account_name} (id=${account.id})`))

    console.log()
    const target = await selectTarget(account.id)
    console.log(chalk.green(`✓ Target: ${target.target_url} [${target.target_type}]`))

    // Template + Config
    const template = await selectMessageTemplate()
    console.log(chalk.green(`✓ ข้อความ: ${template.text.slice(0, 50)}`))

    const { config, maxRounds } = await setupConfig()

    const confirm = await askConfirm('\nพร้อมเริ่มทำงาน?', true)
    if (!confirm) {
      await closeBrowser()
      return
    }

    // Start Job
    const jobId = createJob()
    logEvent('job_setup', { account: account.id, target: target.target_url, rounds: maxRounds })

    // Run Scan Loop
    await runJobLoop(account, target, template, config, maxRounds)

    // End Job + Summary
    const summary = endJob()
    await closeBrowser()

    showSummary(summary)

  } catch (err: unknown) {
    logError('job_fatal_error', err)
    await closeBrowser()
    const msg = err instanceof Error ? err.message : String(err)
    console.log(chalk.red(`\n✗ เกิดข้อผิดพลาด: ${msg}`))
  }
}
