export type Badge = { id: number; type: string; key: string; label: string; color: string | null }
export type TransitionType = { id: number; key: string; label: string }
export type BadgeTransition = {
  id: number
  project: string
  type_id: number
  from_id: number
  from_key: string
  from_label: string
  to_id: number
  to_key: string
  to_label: string
}
export type BadgeTransitionsResponse = {
  mi: BadgeTransition[]
  md: BadgeTransition[]
  ma: BadgeTransition[]
  mc: BadgeTransition[]
  transition_types: TransitionType[]
  badges: Badge[]
}
export type UIField = {
  id: number
  tag: string
  label: string
  type: string
  list_view: boolean
  form_view: boolean
  bulk_view: boolean
  section: string
  perm_tag: string | null
  order: number | null
}
export type UIFieldsResponse = Record<string, UIField[]>
export type Job = { id: number; job_key: string; bucket_key: string; label: string; scale_by: string; bucket_label: string }
export type RoleEntry = { id: number; key: string; label: string; dept_key: string; level_key: string }
export type TagEntry = { id: number; tag: string; description: string }
export type RoleTagsResponse = {
  roles: RoleEntry[]
  tags: TagEntry[]
  matrix: Record<string, { read: boolean; write: boolean }>
}
