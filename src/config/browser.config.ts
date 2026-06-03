import 'dotenv/config'

export const browserConfig = {
  headless: process.env.HEADLESS === 'true',
  slowMo: Number(process.env.SLOW_MO) || 50,
  timeout: 30_000,
  viewport: { width: 1280, height: 800 },
  profilePath: process.env.BROWSER_PROFILE_PATH || '',
}
