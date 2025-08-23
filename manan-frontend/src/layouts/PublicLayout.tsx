"use client"

import { Outlet } from "react-router-dom"
import NavBar from "../components/NavBar"
import { useEffect, useState } from "react"

const PublicLayout = () => {
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
    <div className="min-h-screen bg-background text-foreground transition-colors">
      <NavBar theme={theme} onThemeToggle={toggleTheme} />
      <main className="min-h-[calc(100vh-4rem)]">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout
