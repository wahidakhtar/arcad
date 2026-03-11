import { Link, useLocation } from "react-router-dom"

export interface SidebarItem {
  key: string
  label: string
  path: string
}

interface SidebarListProps {
  items: SidebarItem[]
  onActivePlusClick?: (key: string) => void
}

export default function SidebarList({
  items,
  onActivePlusClick
}: SidebarListProps) {

  const location = useLocation()

  return (
    <>
      {items.map((item) => {

        const isActive =
          location.pathname === item.path ||
          location.pathname.startsWith(item.path + "/")

        return (
          <div
            key={item.key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "10px 0"
            }}
          >

            <Link
              to={item.path}
              style={{
                color: "white",
                textDecoration: "none"
              }}
            >
              {item.label}
            </Link>

            {isActive && onActivePlusClick && (
              <button
                style={{
                  background: "white",
                  color: "#8B1A1A",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 6px"
                }}
                onClick={() => onActivePlusClick(item.key)}
              >
                +
              </button>
            )}

          </div>
        )
      })}
    </>
  )
}