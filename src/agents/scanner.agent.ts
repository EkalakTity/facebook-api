import { Page } from 'playwright'
import { RawPost, ScanConfig } from '../types/post.types'
import { scrollDown, waitRandom } from '../utils/scroll.util'
import { extractPostId, normalizePostUrl, isPostUrl } from '../utils/url.util'

const FB_BASE = 'https://www.facebook.com'

export async function navigateToTarget(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  // รอให้ Feed โหลดก่อน
  await waitRandom(2000, 3500)
}

// ดึง post URL จาก link ทุกตัวในโพสต์
async function extractUrlFromArticle(article: Awaited<ReturnType<Page['$']>>): Promise<string | null> {
  if (!article) return null

  const links = await article.$$('a[href]')

  for (const link of links) {
    const href = await link.getAttribute('href').catch(() => null)
    if (!href) continue

    const full = href.startsWith('http') ? href : `${FB_BASE}${href}`

    if (isPostUrl(full)) {
      return normalizePostUrl(full)
    }
  }

  return null
}

// ดึง author name จาก article
async function extractAuthor(article: Awaited<ReturnType<Page['$']>>): Promise<string | null> {
  if (!article) return null

  // Facebook มักใส่ชื่อผู้โพสต์ใน h2 หรือ h3 ที่มี link
  for (const sel of ['h2 a', 'h3 a', 'strong a']) {
    const el = await article.$(sel).catch(() => null)
    if (el) {
      const text = await el.innerText().catch(() => '')
      if (text.trim()) return text.trim()
    }
  }

  return null
}

// ดึง post text บางส่วน
async function extractText(article: Awaited<ReturnType<Page['$']>>): Promise<string | null> {
  if (!article) return null

  for (const sel of [
    '[data-ad-preview="message"]',
    '[data-testid="post_message"]',
    'div[dir="auto"]',
  ]) {
    const el = await article.$(sel).catch(() => null)
    if (el) {
      const text = await el.innerText().catch(() => '')
      const trimmed = text.trim()
      if (trimmed) return trimmed.slice(0, 500)
    }
  }

  return null
}

export async function scanVisiblePosts(page: Page): Promise<RawPost[]> {
  const posts: RawPost[] = []
  const seen = new Set<string>()

  const articles = await page.$$('[role="article"]')

  for (const article of articles) {
    try {
      const postUrl = await extractUrlFromArticle(article)
      if (!postUrl) continue

      // กัน duplicate ในรอบเดียวกัน
      if (seen.has(postUrl)) continue
      seen.add(postUrl)

      const [authorName, postText] = await Promise.all([
        extractAuthor(article),
        extractText(article),
      ])

      posts.push({
        postUrl,
        postId: extractPostId(postUrl),
        postText,
        authorName,
        foundAt: new Date().toISOString(),
      })
    } catch {
      // ข้ามโพสต์ที่ดึงข้อมูลไม่ได้โดยไม่หยุดการ scan
    }
  }

  return posts
}

export async function runScanRound(
  page: Page,
  targetUrl: string,
  config: ScanConfig,
): Promise<RawPost[]> {
  await navigateToTarget(page, targetUrl)

  const allPosts: RawPost[] = []
  const seen = new Set<string>()

  for (let scroll = 0; scroll <= config.scrollPerRound; scroll++) {
    const found = await scanVisiblePosts(page)

    for (const post of found) {
      if (!seen.has(post.postUrl)) {
        seen.add(post.postUrl)
        allPosts.push(post)

        if (allPosts.length >= config.maxPostsPerRound) {
          return allPosts
        }
      }
    }

    if (scroll < config.scrollPerRound) {
      await scrollDown(page, 1, 1500)
    }
  }

  await waitRandom(config.cooldownMs, config.cooldownMs + 3000)

  return allPosts
}
