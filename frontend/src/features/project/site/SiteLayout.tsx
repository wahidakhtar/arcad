import { Outlet, useParams, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export default function SiteLayout() {
  const { projectCode, siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState<any>(null)

  useEffect(() => {
    if (!projectCode || !siteId) return

    api.get(`/${projectCode}/site/${siteId}`)
      .then((res) => setSite(res.data))
      .catch((err) => {
        if (err.response?.status === 403) {
          navigate(`/${projectCode}`)
        }
      })
  }, [projectCode, siteId])

  if (!site) return null

  return <Outlet context={{ site }} />
}
