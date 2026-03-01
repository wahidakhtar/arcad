import { useOutletContext } from "react-router-dom"
import FeFinancePanel from "../components/FeFinancePanel"

export default function SiteFeFinancePage() {
  const { site, reload } = useOutletContext<any>()

  return (
    <div>
      <FeFinancePanel site={site} onUpdated={reload} />
    </div>
  )
}
