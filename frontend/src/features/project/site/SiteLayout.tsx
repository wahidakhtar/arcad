import { Outlet, useParams, useNavigate, Link, useLocation } from "react-router-dom"
import { useEffect, useState } from "react"
import { api } from "../../../lib/api"

export default function SiteLayout() {
  const { projectCode, siteId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()

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

  const base = `/${projectCode}/site/${siteId}`

  const isDetails = location.pathname.endsWith("/details")
  const isFe = location.pathname.endsWith("/fe")

  return (
    <div>

      <div style={{
        display: "flex",
        gap: 20,
        borderBottom: "1px solid #ccc",
        marginBottom: 20
      }}>
        <Link
          to={`${base}/details`}
          style={{
            padding: "6px 10px",
            borderBottom: isDetails ? "2px solid black" : "none"
          }}
        >
          Details
        </Link>

        <Link
          to={`${base}/fe`}
          style={{
            padding: "6px 10px",
            borderBottom: isFe ? "2px solid black" : "none"
          }}
        >
          FE + Finance
        </Link>
      </div>

      <Outlet context={{ site }} />

    </div>
  )
}
