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
    </div>
  )
}
