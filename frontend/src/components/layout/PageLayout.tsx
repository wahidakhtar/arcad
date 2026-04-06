import { useState } from "react"
import { Outlet } from "react-router-dom"

import Sidebar from "./Sidebar"

function MenuIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-4 w-4">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className="h-4 w-4">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

export default function PageLayout({ children }: { children?: React.ReactNode }) {
  const [open, setOpen] = useState(true)

  return (
    <div className="page-shell pb-2">
      <div className="relative z-10 flex h-full gap-4 overflow-clip p-4">

        {/* Mobile backdrop — tapping it closes the sidebar */}
        <div
          className={`fixed inset-0 z-20 bg-black/40 backdrop-blur-sm transition-opacity duration-300 md:hidden ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
          onClick={() => setOpen(false)}
        />

        {/* Sidebar wrapper
            Mobile : fixed overlay, slides in/out on x axis
            Desktop: inline flex child, hidden via display:none when closed  */}
        <div
          className={`
            fixed bottom-4 left-4 top-4 z-30 transition-transform duration-300 ease-in-out
            md:relative md:bottom-auto md:left-auto md:top-auto md:z-auto md:transition-none
            ${open ? "translate-x-0" : "-translate-x-[calc(100%+2rem)] md:hidden"}
          `}
        >
          <Sidebar onClose={() => setOpen(false)} />
        </div>

        {/* Main content area */}
        <main
          className="relative flex flex-1 flex-col overflow-hidden rounded-[48px] border border-white/50 bg-white"
          style={{ boxShadow: "0 18px 60px rgba(83,20,20,0.12)" }}
        >
          {/* Sidebar toggle button — only shown when sidebar is closed */}
          {!open && (
            <button
              onClick={() => setOpen(true)}
              title="Show sidebar"
              className="absolute left-5 top-5 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-jscolors-crimson/20 bg-white/90 text-jscolors-crimson shadow-sm transition hover:bg-jscolors-crimson/5 active:scale-95"
            >
              <MenuIcon />
            </button>
          )}

          <div className="flex flex-1 flex-col overflow-hidden p-8 pb-6 md:p-10 md:pb-8">
            {children ?? <Outlet />}
          </div>
        </main>
      </div>

      <footer className="pointer-events-none fixed bottom-1 left-1/2 z-20 -translate-x-1/2 py-0 text-center leading-none tracking-normal text-gray-800 text-[12px]">
        Copyright © 2026 Wahid Akhtar. All rights reserved.
      </footer>
    </div>
  )
}
