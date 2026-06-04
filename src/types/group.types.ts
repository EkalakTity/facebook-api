export type GroupJoinStatus = 'request_sent' | 'joined' | 'already_member' | 'failed'

export interface GroupSearchResult {
  name: string
  url: string
  memberCount: string | null
  privacy: 'public' | 'private' | null
}

export interface GroupJoinRecord {
  id: number
  group_name: string
  group_url: string
  status: GroupJoinStatus
  requested_at: string
}

export interface NewGroupJoinRecord {
  group_name: string
  group_url: string
  status: GroupJoinStatus
}
