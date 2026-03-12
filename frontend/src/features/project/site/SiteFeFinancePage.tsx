import { useOutletContext } from "react-router-dom"
import FeFinancePanel from "../components/FeFinancePanel"
import AccountsPanel from "../components/AccountsPanel"

export default function SiteFeFinancePage() {

  const { site, reload, projectCode, permissions } = useOutletContext<any>()

  return (
    <div>

      {permissions?.request_finance && (
        <FeFinancePanel
          site={site}
          projectCode={projectCode}
          onUpdated={reload}
        />
      )}

      {permissions?.execute_finance && (
        <AccountsPanel
          site={site}
          projectCode={projectCode}
        />
      )}

    </div>
  )
}