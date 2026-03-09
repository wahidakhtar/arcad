import { useOutletContext } from "react-router-dom"
import FeFinancePanel from "../components/FeFinancePanel"

export default function SiteFeFinancePage() {

  const { site, reload, projectCode } = useOutletContext<any>()

  return (
    <div>
      <FeFinancePanel
        site={site}
        projectCode={projectCode}
        onUpdated={reload}
      />
    </div>
  )
}