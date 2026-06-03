import { db } from '../database'

export interface LogEntry {
  id: number
  job_id: string
  level: string
  message: string
  data: string | null
  created_at: string
}

export const logRepo = {
  save(jobId: string, level: string, message: string, data?: unknown): void {
    db.prepare(`
      INSERT INTO logs (job_id, level, message, data)
      VALUES (?, ?, ?, ?)
    `).run(jobId, level, message, data !== undefined ? JSON.stringify(data) : null)
  },

  getByJob(jobId: string): LogEntry[] {
    return db
      .prepare('SELECT * FROM logs WHERE job_id = ? ORDER BY created_at ASC')
      .all(jobId) as LogEntry[]
  },

  getRecent(limit = 50): LogEntry[] {
    return db
      .prepare('SELECT * FROM logs ORDER BY created_at DESC LIMIT ?')
      .all(limit) as LogEntry[]
  },

  countEventsByJob(jobId: string): Record<string, number> {
    const rows = db
      .prepare(`SELECT message, COUNT(*) as count FROM logs WHERE job_id = ? GROUP BY message`)
      .all(jobId) as { message: string; count: number }[]
    return Object.fromEntries(rows.map((r) => [r.message, r.count]))
  },

  getJobList(limit = 10): { job_id: string; created_at: string }[] {
    return db
      .prepare(`
        SELECT job_id, MIN(created_at) as created_at
        FROM logs
        GROUP BY job_id
        ORDER BY created_at DESC
        LIMIT ?
      `)
      .all(limit) as { job_id: string; created_at: string }[]
  },
}
