import { api } from "../../../lib/api"

export async function createMiSite(data: any) {
  try {
    const res = await api.post("/mi", data)
    return { success: true, data: res.data }
  } catch (err: any) {
    const detail = err?.response?.data?.detail

    if (detail?.existing_site) {
      return {
        success: false,
        duplicate: true,
        existing_site: detail.existing_site
      }
    }

    return {
      success: false,
      error: detail?.message || detail || "Failed to create site"
    }
  }
}

export async function updateMiStatus(siteId: number, badgeId: number) {
  await api.put("/mi/site/" + siteId, {
    status_badge_id: badgeId
  })
}
