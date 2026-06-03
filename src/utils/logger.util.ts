import chalk from 'chalk'
import fs from 'fs'
import path from 'path'

export type LogLevel = 'info' | 'warn' | 'error' | 'debug'

const LOG_DIR = './logs'

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
}

function todayFile(): string {
  const date = new Date().toISOString().split('T')[0]
  return path.join(LOG_DIR, `${date}.log`)
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').split('.')[0]
}

const color: Record<LogLevel, (s: string) => string> = {
  info:  chalk.cyan,
  warn:  chalk.yellow,
  error: chalk.red,
  debug: chalk.gray,
}

export function log(level: LogLevel, message: string, data?: unknown): void {
  const ts = timestamp()
  const isDebug = level === 'debug'
  const showDebug = process.env.LOG_LEVEL === 'debug'

  if (!isDebug || showDebug) {
    const dataStr = data !== undefined ? ' ' + chalk.gray(JSON.stringify(data)) : ''
    console.log(`${chalk.gray(ts)} ${color[level](level.toUpperCase().padEnd(5))} ${message}${dataStr}`)
  }

  ensureLogDir()
  const dataJson = data !== undefined ? ' ' + JSON.stringify(data) : ''
  const line = `[${ts}] ${level.toUpperCase().padEnd(5)} ${message}${dataJson}\n`
  fs.appendFileSync(todayFile(), line, 'utf8')
}
