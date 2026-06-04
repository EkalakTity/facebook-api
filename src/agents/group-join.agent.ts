import { Page, ElementHandle } from 'playwright'
import { GroupSearchResult, GroupJoinStatus } from '../types/group.types'
import { waitRandom } from '../utils/scroll.util'

const FB_BASE = 'https://www.facebook.com'
const SKIP_SLUGS = new Set(['discover', 'feed', 'notifications', 'search', 'join'])

async function findButton(page: Page, texts: string[]): Promise<ElementHandle | null> {
  for (const text of texts) {
    try {
      const el = await page.$(`div[role="button"]:has-text("${text}")`)
      if (el) return el
    } catch { continue }
  }
  return null
}

export async function searchGroupByName(page: Page, query: string): Promise<GroupSearchResult[]> {
  await page.goto(`${FB_BASE}/search/groups/?q=${encodeURIComponent(query)}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  })
  await waitRandom(2500, 4000)

  const results: GroupSearchResult[] = []
  const seen = new Set<string>()

  const articles = await page.$$('[role="article"]')

  for (const article of articles.slice(0, 10)) {
    try {
      const links = await article.$$('a[href*="/groups/"]')
      let groupUrl: string | null = null
      let groupName: string | null = null

      for (const link of links) {
        const href = await link.getAttribute('href').catch(() => null)
        if (!href) continue

        const full = href.startsWith('http') ? href : `${FB_BASE}${href}`
        const match = full.match(/facebook\.com\/groups\/([^/?#]+)/)
        if (!match) continue

        const slug = match[1]
        if (SKIP_SLUGS.has(slug)) continue

        if (!groupUrl) {
          groupUrl = `${FB_BASE}/groups/${slug}`
          const text = (await link.textContent().catch(() => null))?.trim()
          if (text && text.length > 1) groupName = text
        }
      }

      if (!groupUrl || !groupName || seen.has(groupUrl)) continue
      seen.add(groupUrl)

      const bodyText = (await article.textContent().catch(() => '')) ?? ''
      const memberMatch = bodyText.match(/([\d,.]+[Kk]?)\s*(สมาชิก|member)/i)
      const privacy: 'public' | 'private' | null =
        /สาธารณะ|public/i.test(bodyText) ? 'public' :
        /ส่วนตัว|private/i.test(bodyText) ? 'private' :
        null

      results.push({
        name: groupName,
        url: groupUrl,
        memberCount: memberMatch ? memberMatch[1] : null,
        privacy,
      })
    } catch { continue }
  }

  return results
}

export async function requestJoinGroup(page: Page, groupUrl: string): Promise<GroupJoinStatus> {
  await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 })
  await waitRandom(2500, 4000)

  // Already a member
  const leaveBtn = await findButton(page, ['ออกจากกลุ่ม', 'Leave group', 'Leave Group'])
  if (leaveBtn) return 'already_member'

  // Request already pending
  const cancelBtn = await findButton(page, ['ยกเลิกคำขอ', 'Cancel request', 'Cancel Request'])
  if (cancelBtn) return 'request_sent'

  // Find join button
  const joinBtn = await findButton(page, ['ขอเข้าร่วม', 'Join group', 'Join Group', 'Join'])
  if (!joinBtn) return 'failed'

  await joinBtn.click()
  await waitRandom(1500, 2500)

  // Handle possible confirmation dialog (private groups)
  const confirmBtn = await findButton(page, ['ยืนยัน', 'Confirm', 'ส่งคำขอ', 'Send request'])
  if (confirmBtn) {
    await confirmBtn.click()
    await waitRandom(1500, 2500)
  }

  // Detect result
  const afterCancel = await findButton(page, ['ยกเลิกคำขอ', 'Cancel request', 'Cancel Request'])
  if (afterCancel) return 'request_sent'

  const afterLeave = await findButton(page, ['ออกจากกลุ่ม', 'Leave group', 'Leave Group'])
  if (afterLeave) return 'joined'

  return 'request_sent'
}
