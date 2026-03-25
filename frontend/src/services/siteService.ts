import { api } from "../lib/api"

export const getSite = (projectKey: string, siteId: string | number) =>
  api.get(`/sites/${projectKey}/${siteId}`)

export const updateSite = (projectKey: string, siteId: string | number, data: unknown) =>
  api.patch(`/sites/${projectKey}/${siteId}`, data)

export const getSiteList = (projectKey: string, params?: Record<string, unknown>) =>
  api.get(`/sites/${projectKey}`, params ? { params } : undefined)

export const createSite = (projectKey: string, data: unknown) =>
  api.post(`/sites/${projectKey}`, data)
