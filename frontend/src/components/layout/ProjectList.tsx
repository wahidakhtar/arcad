import { Link, useLocation } from "react-router-dom"

interface ProjectListProps {
  projects: string[]
  onActivePlusClick?: () => void
}

const PROJECT_LABELS: Record<string, string> = {
  mi: "Mast Installation",
  md: "Mast Dismantle",
  ma: "Mast Audit",
  mc: "Mast CM",
  bb: "Broadband",
}

export default function ProjectList({
  projects,
  onActivePlusClick,
}: ProjectListProps) {

  const location = useLocation()

  return (
    <>
      {projects.map((projectCode) => {

        const isActive = location.pathname.startsWith("/" + projectCode)

        return (
          <div
            key={projectCode}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "10px 0",
            }}
          >
            <Link
              to={"/" + projectCode}
              style={{ color: "white", textDecoration: "none" }}
            >
              {PROJECT_LABELS[projectCode] || projectCode}
            </Link>

            {isActive && onActivePlusClick && (
              <button
                style={{
                  background: "white",
                  color: "#8B1A1A",
                  border: "none",
                  cursor: "pointer",
                  padding: "2px 6px",
                }}
                onClick={onActivePlusClick}
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
