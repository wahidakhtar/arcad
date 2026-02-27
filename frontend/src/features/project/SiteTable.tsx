export default function SiteTable({
  siteList,
  onSelect,
}: {
  siteList: any[]
  onSelect: (site: any) => void
}) {
  return (
    <table border={1} cellPadding={6}>
      <thead>
        <tr>
          <th>CKT</th>
          <th>Customer</th>
          <th>Status</th>
          <th>Budget</th>
          <th>Balance</th>
        </tr>
      </thead>
      <tbody>
        {siteList.map((s) => (
          <tr
            key={s.id}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(s)}
          >
            <td>{s.ckt_id}</td>
            <td>{s.customer}</td>
            <td>
              <span style={{
                background: s.status_color,
                padding: "4px 8px",
                borderRadius: "4px",
                color: "black"
              }}>
                {s.status}
              </span>
            </td>
            <td>{s.budget}</td>
            <td>{s.balance}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
