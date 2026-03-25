import { api } from "../lib/api"
import type { Badge, BadgeTransitionsResponse, Job, RoleTagsResponse } from "../features/admin/types"

export const getAdminBadges = () =>
  api.get<Badge[]>("/admin/badges")

export const updateAdminBadge = (id: number, data: { label: string; color: string | null }) =>
  api.patch(`/admin/badges/${id}`, data)

export const getBadgeTransitions = () =>
  api.get<BadgeTransitionsResponse>("/admin/badge-transitions")

export const addBadgeTransition = (data: { project: string; type_id: number; from_id: number; to_id: number }) =>
  api.post("/admin/badge-transitions", data)

export const deleteBadgeTransition = (project: string, id: number) =>
  api.delete(`/admin/badge-transitions/${project}/${id}`)

export const getAdminJobs = () =>
  api.get<Job[]>("/admin/jobs")

export const updateAdminJob = (id: number, data: { label: string; scale_by: string }) =>
  api.patch(`/admin/jobs/${id}`, data)

export const getRoleTags = () =>
  api.get<RoleTagsResponse>("/admin/role-tags")

export const updateRoleTag = (data: { role_id: number; tag_id: number; read: boolean; write: boolean }) =>
  api.patch("/admin/role-tags", data)
