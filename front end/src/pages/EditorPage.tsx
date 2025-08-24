"use client"

import type React from "react"
import { useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useSelector, useDispatch } from "react-redux"
import type { RootState } from "../store/store"
import { setCurrentPage } from "../store/slices/pageSlice"
import { usePage, useUpdatePage } from "../hooks/useApi"
import Sidebar from "../components/Sidebar"
import PageHeader from "../components/Pageheader"
import BlockNoteEditor from "../components/BlockEditor"
import { MobileNav } from "../components/ui/mobile-nav"
import { ThemeToggle } from "../components/ui/theme-toggle"

import { cn } from "../lib/utils"
import { toast } from "../hooks/use-toast"

const EditorPage: React.FC = () => {
  const { pageId } = useParams<{ pageId: string }>()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { sidebarCollapsed } = useSelector((state: RootState) => state.pages)

  const { data: page, isLoading, error } = usePage(pageId!)
  const updatePageMutation = useUpdatePage()

  useEffect(() => {
    if (page) {
      dispatch(setCurrentPage(page))
    }
  }, [page, dispatch])

  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: "Failed to load page. Please try again.",
        variant: "destructive",
      })
      navigate("/home")
    }
  }, [error, navigate])

  const handlePageUpdate = async (updates: Partial<typeof page>) => {
    if (!page) return

    try {
      await updatePageMutation.mutateAsync({
        id: page.id,
        data: updates,
      })

      toast({
        title: "Success",
        description: "Page updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update page. Please try again.",
        variant: "destructive",
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div
          className={cn(
            "flex-1 flex items-center justify-center transition-all duration-300",
            "md:ml-16 lg:ml-64",
            !sidebarCollapsed && "lg:ml-64",
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading page...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="flex h-screen bg-background w-screen">
        <div className="hidden md:block">
          <Sidebar />
        </div>
        <div
          className={cn(
            "flex-1 flex items-center justify-center transition-all duration-300",
            "md:ml-16 lg:ml-64",
            !sidebarCollapsed && "lg:ml-64",
          )}
        >
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-muted rounded-xl flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-foreground">Page not found</h2>
            <p className="text-muted-foreground text-sm">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/98 backdrop-blur-md border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <MobileNav>
            <Sidebar />
          </MobileNav>
          <h1 className="text-base font-medium truncate mx-4 text-foreground max-w-[200px]">
            {page.title || "Untitled"}
          </h1>
          <ThemeToggle />
        </div>
      </div>

      <main
        className={cn(
          "flex-1 flex flex-col transition-all duration-300 relative",
          "md:ml-16 lg:ml-64",
          !sidebarCollapsed && "lg:ml-64",
          "pt-[57px] md:pt-0",
        )}
      >
        <div className="hidden md:block fixed top-6 right-6 z-40">
          <ThemeToggle />
        </div>

        <div className="flex-1 overflow-auto scrollbar-hide">
          <div className="min-w-[320px] max-w-4xl mx-auto w-full px-6 md:px-8">
            <PageHeader page={page} onUpdate={handlePageUpdate} isUpdating={updatePageMutation.isPending} />
            <div className="pb-12">
              <BlockNoteEditor pageId={page.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default EditorPage
