export const TABS = ["Badges", "Badge Transitions", "UI Fields", "Jobs", "Tags & Roles"] as const
export type Tab = (typeof TABS)[number]

export const PROJECTS = ["mi", "md", "ma", "mc"] as const
export type ProjectKey = (typeof PROJECTS)[number]

export const PERM_TAG_OPTIONS = ["", "billing", "doc_badge", "site:write"]
export const SCALE_BY_OPTIONS = ["height", "height_if_true", "numeric", "visit_date", "unit"]

export const tableWrapCls = "overflow-x-auto rounded-[24px] border border-jscolors-crimson/10 bg-white"
export const tableCls = "min-w-full border-collapse table-fixed"
export const theadRowCls = "border-b border-jscolors-crimson/10 bg-jscolors-crimson/[0.03]"
export const thCls = "px-5 py-3 text-left text-xs font-semibold uppercase tracking-[0.24em] text-jscolors-text/50"
export const tbodyRowCls = "border-b border-jscolors-crimson/8"
export const tdCls = "px-5 py-4 text-sm text-jscolors-text"
export const fieldCls = "w-full rounded-xl border border-jscolors-crimson/15 bg-white px-3 py-2 text-sm outline-none focus:border-jscolors-crimson/40"
export const labelCls = "mb-1 block text-xs font-semibold uppercase tracking-[0.22em] text-jscolors-text/45"
