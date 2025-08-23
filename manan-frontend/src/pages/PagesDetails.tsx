"use client"

import { useParams } from "react-router-dom"
import { usePageById } from "../hooks/usePages"
import PageEditor from "../components/editor/PageEditor"
import EditablePageHeader from "../components/editor/EditablePageHeader"

const PagesDetails = () => {
  const { id } = useParams<{ id: string }>()
  const { data: pageInfo, isLoading: pageLoading } = usePageById(id)

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="animate-pulse">
          <div className="h-80 bg-gradient-to-br from-muted/50 via-muted/30 to-muted/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-muted-foreground/20 rounded-xl"></div>
                <div className="h-8 bg-muted-foreground/20 rounded-xl flex-1 max-w-md"></div>
              </div>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
            <div className="h-4 bg-muted rounded-lg w-3/4"></div>
            <div className="h-4 bg-muted rounded-lg w-1/2"></div>
            <div className="h-4 bg-muted rounded-lg w-5/6"></div>
          </div>
        </div>

        <div className="fixed bottom-6 right-6 z-50">
          <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl px-6 py-4 shadow-xl flex items-center gap-3 animate-fade-in">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm font-medium text-card-foreground">Loading page...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!pageInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md mx-auto animate-fade-in">
          <div className="w-20 h-20 bg-destructive/10 rounded-2xl flex items-center justify-center mx-auto ring-1 ring-destructive/20">
            <svg className="w-10 h-10 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-semibold text-foreground">Page Not Found</h2>
            <p className="text-muted-foreground leading-relaxed">
              The page you're looking for doesn't exist or has been moved.
            </p>
          </div>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl hover:bg-primary/90 transition-all duration-200 focus-ring font-medium btn-hover"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col animate-fade-in">
      <header className="w-full">
        <EditablePageHeader pageInfo={pageInfo} />
      </header>

      <main className="flex-1 w-full py-8">
        <div className="max-w-[90rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card-enhanced">
            <PageEditor pageId={id!} />
          </div>
        </div>
      </main>
    </div>
  )
}

export default PagesDetails
