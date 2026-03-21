import { Outlet } from "react-router-dom"

import Sidebar from "./Sidebar"

export default function PageLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="page-shell pb-2">
      <div className="relative z-10 flex h-full gap-4 overflow-hidden p-4">
        <Sidebar />
        <main className="glass-panel flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 pb-4 md:p-8 md:pb-6">{children ?? <Outlet />}</div>
        </main>
      </div>
      <footer className="pointer-events-none fixed bottom-1.2 left-1/2 z-20 -translate-x-1/2 py-0 text-center leading-none tracking-normal text-gray-800 text-[12px]">
        Copyright © 2026 Wahid Akhtar. All rights reserved.
      </footer>
    </div>
  )
}
