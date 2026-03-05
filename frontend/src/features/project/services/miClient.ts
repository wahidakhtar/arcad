import { api } from "../../../lib/api"

export async function createMiSite(data: any) {

  try {

    const res = await api.post(`/${data.project_code}/create`, data)

    return { success: true, data: res.data }

  } catch (err: any) {

    const detail = err?.response?.data?.detail

    return {
      success: false,
      error: detail?.message || detail || "Failed to create site"
    }

  }
}
