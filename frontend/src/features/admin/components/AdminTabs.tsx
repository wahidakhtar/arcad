import { Link } from "react-router-dom"
import Button from "../../../components/ui/Button"
import { TABS, type Tab } from "../constants"

export default function AdminTabs({
  activeTab,
  onSelect,
}: {
  activeTab: Tab
  onSelect: (tab: Tab) => void
}) {
  return (
    <div className="glass-panel p-4 flex gap-2 flex-wrap">
      {TABS.map((tab) => (
        <Button
          key={tab}
          onClick={() => onSelect(tab)}
          variant="secondary"
          className={`${
            activeTab === tab
              ? "border-jscolors-crimson bg-jscolors-crimson text-white shadow-glow"
              : "border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40"
          }`}
        >
          {tab}
        </Button>
      ))}
      <div className="ml-auto flex gap-2">
        <Link to="/admin/schema-browser">
          <Button variant="secondary" className="border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40">
            Schema Browser
          </Button>
        </Link>
        <Link to="/admin/error-log">
          <Button variant="secondary" className="border-jscolors-crimson/20 bg-white text-jscolors-crimson hover:border-jscolors-crimson/40">
            Error Log
          </Button>
        </Link>
      </div>
    </div>
  )
}
