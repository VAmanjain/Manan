"use client"

import type React from "react"
import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import type { RootState } from "../store/store"
import { toggleSidebar } from "../store/slices/pageSlice"
import { usePages, useCreatePage, useDeletePage } from "../hooks/useApi"
import { Button } from "./ui/button"
import { ScrollArea } from "./ui/scroll-area"
import { FileText, Plus, ChevronLeft, ChevronRight, Home, Settings, Search, Trash2 } from "lucide-react"
import { cn } from "../lib/utils"
import { UserButton } from "@clerk/clerk-react"

const Sidebar: React.FC = () => {
  const dispatch = useDispatch()
  const location = useLocation()
  const navigate = useNavigate()
  const { sidebarCollapsed } = useSelector((state: RootState) => state.pages)
  const { data: pages = [], isLoading } = usePages()
  const createPageMutation = useCreatePage()
  const deletePageMutation = useDeletePage()
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null)

  const handleCreatePage = async () => {
    try {
      const newPage = await createPageMutation.mutateAsync({
        title: "Untitled",
      })
      navigate(`/page/${newPage.id}`)
    } catch (error) {
      console.error("Failed to create page:", error)
    }
  }

  const handleDeletePage = async (pageId: string, pageTitle: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()

    if (window.confirm(`Are you sure you want to delete "${pageTitle}"? This action cannot be undone.`)) {
      try {
        await deletePageMutation.mutateAsync(pageId)

        // Navigate away if we're currently viewing the deleted page
        if (location.pathname === `/page/${pageId}`) {
          navigate("/home")
        }
      } catch (error) {
        console.error("Failed to delete page:", error)
        alert("Failed to delete page. Please try again.")
      }
    }
  }

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar())
  }

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-sidebar transition-all duration-300 border-r border-sidebar-border/30",
        sidebarCollapsed ? "w-16" : "w-64",
      )}
    >
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b border-sidebar-border/20">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-heading font-bold text-xl text-sidebar-foreground">Manan</span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSidebar}
            className="ml-auto hover:bg-sidebar-accent/50 transition-all duration-200 rounded-lg"
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex-1 overflow-hidden">
          <div className="p-4 space-y-2">
            <Link to="/home">
              <div
                className={cn(
                  "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                  sidebarCollapsed && "justify-center px-3",
                  location.pathname === "/home"
                    ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground",
                )}
              >
                <Home className="h-4 w-4" />
                {!sidebarCollapsed && <span className="ml-3">Home</span>}
              </div>
            </Link>

            <div
              className={cn(
                "flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                sidebarCollapsed && "justify-center px-3",
                "text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground",
              )}
            >
              <Search className="h-4 w-4" />
              {!sidebarCollapsed && <span className="ml-3">Search</span>}
            </div>
          </div>

          {!sidebarCollapsed && (
            <div className="px-4 py-2">
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-xs font-semibold text-sidebar-foreground/60 uppercase tracking-wider">Pages</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-sidebar-accent/30 transition-all duration-200 rounded-md"
                  onClick={handleCreatePage}
                  disabled={createPageMutation.isPending}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          <ScrollArea className="flex-1 px-4">
            <div className="space-y-1">
              {isLoading ? (
                <div className="p-4 text-sm text-sidebar-foreground/60">{sidebarCollapsed ? "" : "Loading..."}</div>
              ) : pages.length === 0 ? (
                !sidebarCollapsed && <div className="p-4 text-sm text-sidebar-foreground/60">No pages yet</div>
              ) : (
                pages.map((page) => (
                  <div
                    key={page.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredPageId(page.id)}
                    onMouseLeave={() => setHoveredPageId(null)}
                  >
                    <Link to={`/page/${page.id}`}>
                      <div
                        className={cn(
                          "flex items-center px-4 py-3 rounded-lg text-sm transition-all duration-200",
                          sidebarCollapsed && "justify-center px-3",
                          location.pathname === `/page/${page.id}`
                            ? "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground",
                          !sidebarCollapsed && hoveredPageId === page.id && "pr-12",
                        )}
                      >
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        {!sidebarCollapsed && <span className="ml-3 truncate font-medium">{page.title}</span>}
                      </div>
                    </Link>

                    {!sidebarCollapsed && hoveredPageId === page.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 rounded-md"
                        onClick={(e) => handleDeletePage(page.id, page.title, e)}
                        disabled={deletePageMutation.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {sidebarCollapsed && (
            <div className="p-3">
              <Button
                variant="ghost"
                size="icon"
                className="w-full hover:bg-sidebar-accent/50 transition-colors"
                onClick={handleCreatePage}
                disabled={createPageMutation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="border-t border-sidebar-border/20 p-4">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer text-sidebar-foreground hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground">
                <Settings className="h-4 w-4" />
                <span className="ml-3">Settings</span>
              </div>
            )}

            <div className={cn(sidebarCollapsed && "w-full flex justify-center")}>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-8 h-8 rounded-lg shadow-sm",
                  },
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Sidebar
