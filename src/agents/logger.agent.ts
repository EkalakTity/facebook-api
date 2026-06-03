import { log as fileLog } from '../utils/logger.util'
import { logRepo } from '../db/repositories/log.repo'

export interface JobSummary {
  jobId: string
  startedAt: string
  endedAt: string
  durationSec: number
  totalFound: number
  duplicates: number
  queued: number
  done: number
  rejected: number
  errors: number
}

let currentJobId: string | null = null

export function createJob(): string {
  const ts = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15)
  currentJobId = `job_${ts}`
  logEvent('job_start', { jobId: currentJobId })
  return currentJobId
}

export function getJobId(): string {
  if (!currentJobId) throw new Error('ยังไม่ได้เริ่ม Job — เรียก createJob() ก่อน')
  return currentJobId
}

export function logEvent(event: string, data?: unknown): void {
  const jobId = currentJobId ?? 'no_job'
  fileLog('info', event, data)
  logRepo.save(jobId, 'info', event, data)
}

export function logWarn(message: string, data?: unknown): void {
  const jobId = currentJobId ?? 'no_job'
  fileLog('warn', message, data)
  logRepo.save(jobId, 'warn', message, data)
}

export function logError(message: string, err?: unknown): void {
  const jobId = currentJobId ?? 'no_job'
  const errData = err instanceof Error ? { message: err.message } : err
  fileLog('error', message, errData)
  logRepo.save(jobId, 'error', message, errData)
}

export function endJob(): JobSummary {
  const jobId = getJobId()
  logEvent('job_end')
  const summary = generateSummary(jobId)
  currentJobId = null
  return summary
}

export function generateSummary(jobId: string): JobSummary {
  const events = logRepo.countEventsByJob(jobId)
  const logs = logRepo.getByJob(jobId)

  const startedAt = logs[0]?.created_at ?? new Date().toISOString()
  const endedAt   = logs[logs.length - 1]?.created_at ?? startedAt
  const durationSec = Math.round(
    (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000
  )

  // post_found นับจาก post_found + post_duplicate รวมกัน
  const found      = events['post_found']     ?? 0
  const duplicates = events['post_duplicate'] ?? 0

  return {
    jobId,
    startedAt,
    endedAt,
    durationSec,
    totalFound:  found + duplicates,
    duplicates,
    queued:      events['post_queued']    ?? 0,
    done:        events['post_done']      ?? 0,
    rejected:    events['post_rejected']  ?? 0,
    errors:      events['error']          ?? 0,
  }
}
