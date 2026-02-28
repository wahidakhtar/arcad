import { Link, useLocation } from "react-router-dom"

interface ProjectListProps {
  projects: any[]
  onActivePlusClick: () => void
}

export default function ProjectList({
  projects,
  onActivePlusClick,
}: ProjectListProps) {
  const location = useLocation()

  return (
    <>
      {projects.map((p) => {
        const isActive = location.pathname === "/project/" + p.id

        return (
          <div
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "10px 0",
            }}
          >
            <Link
              to={"/project/" + p.id}
              style={{ color: "white", textDecoration: "none" }}
            >
              {p.name}
            </Link>

            {isActive && (
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
