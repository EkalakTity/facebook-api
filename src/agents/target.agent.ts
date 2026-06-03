import { askSelect, askText } from '../cli/prompt'
import { targetRepo } from '../db/repositories/target.repo'
import { Target, TargetType, NewTarget } from '../types/target.types'

export function isFacebookUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'www.facebook.com' || hostname === 'facebook.com' || hostname === 'm.facebook.com'
  } catch {
    return false
  }
}

export function detectTargetType(url: string): TargetType {
  try {
    const { pathname, search } = new URL(url)

    if (pathname.includes('/groups/')) return 'group'

    if (
      pathname.includes('/posts/') ||
      pathname.includes('/permalink/') ||
      search.includes('story_fbid') ||
      search.includes('fbid')
    ) return 'post'

    // pathname ว่างหรือ "/" คือ Feed หลัก
    if (pathname === '/' || pathname === '') return 'feed'

    // มี path segment เดียว เช่น /username → profile
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length === 1) return 'profile'

    return 'feed'
  } catch {
    return 'feed'
  }
}

async function askForNewUrl(): Promise<string> {
  while (true) {
    const url = await askText('ใส่ Facebook URL ที่ต้องการ Scan:')
    const trimmed = url.trim()

    if (!isFacebookUrl(trimmed)) {
      console.log('  ✗ URL ต้องเป็น facebook.com เท่านั้น กรุณาใส่ใหม่')
      continue
    }

    return trimmed
  }
}

export async function selectTarget(accountId: number): Promise<Target> {
  const history = targetRepo.getAll().filter((t) => t.account_id === accountId).slice(0, 5)

  type Choice = 'new' | number
  const choices: { name: string; value: Choice }[] = [
    { name: '+ ใส่ URL ใหม่', value: 'new' },
    ...history.map((t) => ({
      name: `${t.target_url}  (${t.target_type})`,
      value: t.id as Choice,
    })),
  ]

  const picked = await askSelect<Choice>('เลือก Target:', choices)

  if (picked !== 'new') {
    const existing = targetRepo.getById(picked as number)
    if (existing) return existing
  }

  // ใส่ URL ใหม่
  const url = await askForNewUrl()
  const type = detectTargetType(url)

  console.log(`  ✓ ตรวจพบ: ${type}`)

  const data: NewTarget = {
    account_id: accountId,
    target_type: type,
    target_url: url,
  }

  return targetRepo.create(data)
}
