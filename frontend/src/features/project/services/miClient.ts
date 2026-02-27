import { api } from "../../../lib/api"

export async function createMiSite(data: any) {
  try {
    const res = await api.post("/v1/mi", data)
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
      error: detail?.message || "Failed to create site"
    }
  }
}

export async function updateMiStatus(siteId: number, badgeId: number) {
  await api.put("/v1/mi/site/" + siteId, {
    status_badge_id: badgeId
  })
}
