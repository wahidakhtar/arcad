import { Link } from "react-router-dom"

import Button from "../ui/Button"

type DetailPageLayoutProps = {
  title?: React.ReactNode
  subtitle?: React.ReactNode
  backHref?: string
  actions?: React.ReactNode
  badges?: React.ReactNode
  children: React.ReactNode
}

export default function DetailPageLayout({
  title,
  subtitle,
  backHref,
  actions,
  badges,
  children,
}: DetailPageLayoutProps) {
  const isPrimitiveTitle = typeof title === "string" || typeof title === "number"
  const isPrimitiveSubtitle = typeof subtitle === "string" || typeof subtitle === "number"

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {badges ? (
        <div className="flex shrink-0 flex-nowrap items-center gap-2 overflow-x-auto no-scrollbar pb-4">
          {badges}
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto space-y-6">
        {backHref ? (
          <div>
            <Link to={backHref}>
              <Button type="button" variant="secondary">
                ← Back
              </Button>
            </Link>
          </div>
        ) : null}

        {title || subtitle || actions ? (
          <section className="glass-panel p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                {subtitle ? (
                  isPrimitiveSubtitle ? (
                    <p className="text-xs font-semibold uppercase tracking-[0.32em] text-jscolors-text/42">{subtitle}</p>
                  ) : (
                    subtitle
                  )
                ) : null}
                {title ? (
                  isPrimitiveTitle ? (
                    <h1 className="mt-3 font-syne text-4xl font-semibold text-jscolors-crimson">{title}</h1>
                  ) : (
                    title
                  )
                ) : null}
              </div>
              {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
          </section>
        ) : null}

        {children}
      </div>
    </div>
  )
}
