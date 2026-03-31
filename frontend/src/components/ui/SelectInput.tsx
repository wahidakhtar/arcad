import type { ReactNode, SelectHTMLAttributes } from "react"

type SelectInputProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode
}

export default function SelectInput({ children, className = "", ...props }: SelectInputProps) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded-2xl border border-jscolors-crimson/15 bg-white px-4 py-3 pr-11 text-sm outline-none transition focus:border-jscolors-crimson/40 ${className}`.trim()}
      >
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-jscolors-text/45">
        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-current" aria-hidden="true">
          <path d="M4.2 6.1a.75.75 0 0 1 1.06.04L8 9.08l2.74-2.94a.75.75 0 1 1 1.1 1.02l-3.3 3.54a.75.75 0 0 1-1.08 0L4.16 7.16a.75.75 0 0 1 .04-1.06Z" />
        </svg>
      </span>
    </div>
  )
}
