type ListPageLayoutProps = {
  title?: string
  actions?: React.ReactNode
  filters?: React.ReactNode
  children: React.ReactNode
}

export default function ListPageLayout({ title, actions, filters, children }: ListPageLayoutProps) {
  return (
    <div className="space-y-6">
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3">
          {title ? <h1 className="font-syne text-2xl font-semibold text-jscolors-crimson">{title}</h1> : <span />}
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
      )}
      {filters}
      {children}
    </div>
  )
}
