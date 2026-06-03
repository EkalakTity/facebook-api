import { chromium, BrowserContext, Page } from 'playwright'
import { browserConfig } from '../config/browser.config'

let context: BrowserContext | null = null

export async function launchBrowser(profilePath?: string): Promise<BrowserContext> {
  const path = profilePath || browserConfig.profilePath
  if (!path) {
    throw new Error('ไม่พบ BROWSER_PROFILE_PATH — กรุณาตั้งค่าใน .env')
  }

  context = await chromium.launchPersistentContext(path, {
    headless: browserConfig.headless,
    slowMo: browserConfig.slowMo,
    viewport: browserConfig.viewport,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  })

  return context
}

export async function closeBrowser(): Promise<void> {
  if (context) {
    await context.close()
    context = null
  }
}

export function getContext(): BrowserContext {
  if (!context) throw new Error('Browser ยังไม่ได้เปิด — เรียก launchBrowser() ก่อน')
  return context
}

// คืนค่า true ถ้า Login แล้ว, false ถ้ายังไม่ได้ Login
export async function checkSession(page: Page): Promise<boolean> {
  try {
    await page.goto('https://www.facebook.com', {
      waitUntil: 'domcontentloaded',
      timeout: browserConfig.timeout,
    })

    const url = page.url()

    // ถ้า redirect ไปหน้า login = session หมดอายุ
    if (url.includes('/login') || url.includes('login.php')) {
      return false
    }

    // เช็ก element ที่มีเฉพาะตอน Login แล้ว (search bar หรือ nav)
    const loggedIn = await page.$('[aria-label="Facebook"]') !== null
      || await page.$('[data-testid="royal_login_button"]') === null

    return loggedIn
  } catch {
    return false
  }
}
