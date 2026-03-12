import { Link, Outlet, useLocation } from "react-router-dom"

export default function FinancePage() {

  const location = useLocation()

  const isActive = (path: string) =>
    location.pathname.includes(path)

  const linkStyle = (active: boolean) => ({
    textDecoration: "none",
    fontWeight: active ? 700 : 500,
    borderBottom: active ? "2px solid #8B1A1A" : "none",
    paddingBottom: 4
  })

  return (
    <div>

      <h2>Finance</h2>

      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>

        <Link
          to="/finance/rate-card"
          style={linkStyle(isActive("rate-card"))}
        >
          Rate Card
        </Link>

        <Link
          to="/finance/po-invoice"
          style={linkStyle(isActive("po-invoice"))}
        >
          PO / Invoice
        </Link>

        <Link
          to="/finance/requests"
          style={linkStyle(isActive("requests"))}
        >
          Requests
        </Link>

      </div>

      <Outlet />

    </div>
  )
}