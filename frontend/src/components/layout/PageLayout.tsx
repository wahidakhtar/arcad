import { Outlet } from "react-router-dom"

import Sidebar from "./Sidebar"

export default function PageLayout({ children }: { children?: React.ReactNode }) {
  return (
    <div className="page-shell pb-2">
      <div className="relative z-10 flex h-full gap-4 overflow-clip p-4">
        <Sidebar />
        <main className="flex flex-1 flex-col rounded-[48px] border border-white/50 bg-white" style={{ boxShadow: "0 18px 60px rgba(83,20,20,0.12)" }}>
          <div className="flex-1 overflow-y-auto p-8 pb-6 md:p-10 md:pb-8">{children ?? <Outlet />}</div>
        </main>
      </div>
      <footer className="pointer-events-none fixed bottom-1 left-1/2 z-20 -translate-x-1/2 py-0 text-center leading-none tracking-normal text-gray-800 text-[12px]">
        Copyright © 2026 Wahid Akhtar. All rights reserved.
      </footer>
    </div>
  )
}
