import { useState } from "react"

import { useAuth } from "../../context/AuthContext"
import AdminTabs from "./components/AdminTabs"
import BadgesPanel from "./components/BadgesPanel"
import JobsPanel from "./components/JobsPanel"
import RoleTagsPanel from "./components/RoleTagsPanel"
import TransitionsPanel from "./components/TransitionsPanel"
import UiFieldsPanel from "./components/UiFieldsPanel"
import type { Tab } from "./constants"

export default function AdminPage() {
  const { can } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("Badges")

  if (!can("admin", "read")) {
    return <div className="p-6 text-red-600">Access denied.</div>
  }

  return (
    <div className="h-full overflow-y-auto space-y-6">
      <AdminTabs activeTab={activeTab} onSelect={setActiveTab} />

      <div className="glass-panel p-6">
        {activeTab === "Badges" ? <BadgesPanel /> : null}
        {activeTab === "Badge Transitions" ? <TransitionsPanel /> : null}
        {activeTab === "UI Fields" ? <UiFieldsPanel /> : null}
        {activeTab === "Jobs" ? <JobsPanel /> : null}
        {activeTab === "Tags & Roles" ? <RoleTagsPanel /> : null}
      </div>
    </div>
  )
}
