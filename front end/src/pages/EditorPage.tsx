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
import ProgressiveBlur from "@/components/magicui/progressive-blur"

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
            "flex-1 flex items-center justify-center",
            "md:ml-16 lg:ml-64",
            !sidebarCollapsed && "lg:ml-64",
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Loading your workspace...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <div
          className={cn(
            "flex-1 flex items-center justify-center",
            "md:ml-16 lg:ml-64",
            !sidebarCollapsed && "lg:ml-64",
          )}
        >
          <div className="text-center space-y-6 max-w-md">
            <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Page not found</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                The page you're looking for doesn't exist or has been moved. Try checking your recent pages or creating
                a new one.
              </p>
            </div>

            <button
              onClick={() => navigate("/home")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              Go to Home
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block">
        <Sidebar />
      </div>

      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <MobileNav>
            <Sidebar />
          </MobileNav>
          <div className="flex-1 mx-4">
            <h1 className="text-sm font-medium truncate text-center">{page.title || "Untitled"}</h1>
            {updatePageMutation.isPending && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
                <div className="w-1 h-1 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>

      <main
        className={cn(
          "flex-1 flex flex-col",
          "md:ml-16 lg:ml-64",
          !sidebarCollapsed && "lg:ml-64",
          "pt-[73px] md:pt-0",
        )}
      >
        <div className="hidden md:block fixed top-4 right-4 z-40">
          <ThemeToggle />
        </div>

        <div className="flex-1 overflow-auto">
          <div className=" mx-auto w-full px-6 md:px-8 py-6">
            <div className="relative mb-6">
              <PageHeader page={page} onUpdate={handlePageUpdate} isUpdating={updatePageMutation.isPending} />

              {updatePageMutation.isPending && (
                <div className="absolute top-0 right-0 flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
                  <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
                  Saving...
                </div>
              )}
            </div>

            <div className="bg-card mx-auto max-w-4xl border rounded-lg shadow-sm overflow-hidden">
              <BlockNoteEditor pageId={page.id} />
            </div>
             <ProgressiveBlur height="5%" position="bottom" />
          </div>
        </div>

        {updatePageMutation.isPending && (
          <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg flex items-center gap-2 text-sm">
            <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            Auto-saving...
          </div>
        )}
      </main>
    </div>
  )
}

export default EditorPage
