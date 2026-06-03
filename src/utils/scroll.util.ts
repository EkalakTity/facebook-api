import { Page } from 'playwright'

export async function scrollDown(page: Page, times: number, delayMs = 1500): Promise<void> {
  for (let i = 0; i < times; i++) {
    await page.evaluate('window.scrollBy(0, window.innerHeight * 0.8)')
    await waitRandom(delayMs, delayMs + 1500)
  }
}

export function waitRandom(minMs: number, maxMs: number): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs
  return new Promise((resolve) => setTimeout(resolve, delay))
}
