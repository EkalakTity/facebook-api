export type TargetType = 'feed' | 'group' | 'post' | 'profile'

export interface Target {
  id: number
  platform: string
  account_id: number
  target_type: TargetType
  target_name: string | null
  target_url: string
  created_at: string
}

export interface NewTarget {
  account_id: number
  target_type: TargetType
  target_name?: string
  target_url: string
}
