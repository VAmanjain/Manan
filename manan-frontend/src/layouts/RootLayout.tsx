"use client"

import { Outlet } from "react-router-dom"
import type { JSX } from "react"
import Sidebar from "../components/Sidebar.tsx"
import { useEffect, useState } from "react"

export default function RootLayout(): JSX.Element {
  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    return savedTheme || (prefersDark ? "dark" : "light")
  })

  // Apply theme class to document
  useEffect(() => {
    document.documentElement.classList.remove("light", "dark")
    document.documentElement.classList.add(theme)
  }, [theme])

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light"
    setTheme(newTheme)
    localStorage.setItem("theme", newTheme)
  }

  return (
    <div className="flex min-h-screen bg-background transition-colors">
      <aside className="hidden md:flex w-64 border-r border-border bg-card flex-shrink-0 fixed h-full z-10">
        <Sidebar theme={theme} onThemeToggle={toggleTheme} />
      </aside>

      <div className="md:hidden fixed inset-0 z-50 hidden" id="mobile-sidebar-overlay">
        <div
          className="fixed inset-0 bg-black/50"
          onClick={() => {
            document.getElementById("mobile-sidebar-overlay")?.classList.add("hidden")
          }}
        ></div>
        <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border">
          <Sidebar theme={theme} onThemeToggle={toggleTheme} />
        </aside>
      </div>

      <main className="flex-1 md:ml-64 min-h-screen overflow-y-auto">
        <div className="md:hidden flex items-center justify-between p-4 bg-card border-b border-border sticky top-0 z-20">
          <button
            onClick={() => {
              document.getElementById("mobile-sidebar-overlay")?.classList.remove("hidden")
            }}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">Manan</h1>
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>

        <div className="p-4 md:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
