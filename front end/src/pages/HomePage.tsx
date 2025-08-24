"use client"

import type React from "react"
import { Link } from "react-router-dom"
import { useSelector } from "react-redux"
import type { RootState } from "../store/store"
import { usePages, useCreatePage, useUser } from "../hooks/useApi"
import Sidebar from "../components/Sidebar"
import { Plus, FileText, Clock, TrendingUp, Star, Archive } from "lucide-react"
import { cn } from "../lib/utils"

const HomePage: React.FC = () => {
  const { sidebarCollapsed } = useSelector((state: RootState) => state.pages)
  const { data: pages = [], isLoading } = usePages()
  const createPageMutation = useCreatePage()
  const { data: user } = useUser()

  const handleCreatePage = async () => {
    try {
      const newPage = await createPageMutation.mutateAsync({
        title: "Untitled",
      })
      window.location.href = `/page/${newPage.id}`
    } catch (error) {
      console.error("Failed to create page:", error)
    }
  }

  const recentPages = pages.slice(0, 6)

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />

      <main className={cn("flex-1 transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <div className="h-full overflow-auto">
          <div className="max-w-6xl mx-auto px-8 py-12">
            <div className="mb-16">
              <h1 className="text-5xl font-heading font-bold mb-4 text-foreground">Welcome back</h1>
              <p className="text-muted-foreground text-xl leading-relaxed">
                Continue your work or start something new.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-20">
              <div
                className="border border-border/30 rounded-xl p-8 cursor-pointer group hover:border-border/60 transition-all duration-200 bg-card/50 hover:bg-card/80 hover:shadow-lg"
                onClick={handleCreatePage}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-200">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-foreground">New page</h3>
                    <p className="text-muted-foreground">Start writing</p>
                  </div>
                </div>
              </div>

              <div className="border border-border/30 rounded-xl p-8 cursor-pointer group hover:border-border/60 transition-all duration-200 bg-card/50 hover:bg-card/80 hover:shadow-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center group-hover:bg-secondary/20 transition-colors duration-200">
                    <FileText className="h-6 w-6 text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-lg text-foreground">Import</h3>
                    <p className="text-muted-foreground">Upload files</p>
                  </div>
                </div>
              </div>
            </div>

            <section>
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-heading font-semibold text-foreground">Recent</h2>
                {pages.length > 6 && (
                  <button className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium">
                    View all
                  </button>
                )}
              </div>

              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="border border-border/30 rounded-xl p-6 animate-pulse bg-card/30">
                      <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                      <div className="h-3 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </div>
                  ))}
                </div>
              ) : recentPages.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-heading font-semibold mb-3 text-foreground">No pages yet</h3>
                  <p className="text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
                    Create your first page to get started with Manan.
                  </p>
                  <button
                    onClick={handleCreatePage}
                    disabled={createPageMutation.isPending}
                    className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create first page
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recentPages.map((page) => (
                    <Link key={page.id} to={`/page/${page.id}`}>
                      <div className="border border-border/30 rounded-xl p-6 cursor-pointer group hover:border-border/60 transition-all duration-200 bg-card/30 hover:bg-card/60 hover:shadow-lg">
                        <div className="flex items-start space-x-3 mb-4">
                          {page.icon ? (
                            <span className="text-xl flex-shrink-0">{page.icon}</span>
                          ) : (
                            <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                          )}
                          <h3 className="font-heading font-medium text-foreground truncate group-hover:text-primary transition-colors duration-200">
                            {page.title}
                          </h3>
                        </div>

                        <div className="flex items-center text-xs text-muted-foreground mb-3">
                          <Clock className="h-3 w-3 mr-1" />
                          <span>{new Date(page.updatedAt).toLocaleDateString()}</span>
                        </div>

                        {page.coverImage && (
                          <div className="w-full h-20 bg-muted/50 rounded-lg overflow-hidden">
                            <img
                              src={page.coverImage || "/placeholder.svg"}
                              alt={page.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {pages.length > 0 && (
              <section className="mt-20">
                <h2 className="text-2xl font-heading font-semibold text-foreground mb-8">Overview</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="border border-border/30 rounded-xl p-6 bg-card/30">
                    <div className="flex items-center space-x-3 mb-2">
                      <TrendingUp className="h-5 w-5 text-primary" />
                      <div className="text-3xl font-heading font-bold text-foreground">{pages.length}</div>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">Total pages</div>
                  </div>

                  <div className="border border-border/30 rounded-xl p-6 bg-card/30">
                    <div className="flex items-center space-x-3 mb-2">
                      <Archive className="h-5 w-5 text-secondary" />
                      <div className="text-3xl font-heading font-bold text-foreground">
                        {pages.filter((p) => p.isPublished).length}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">Published</div>
                  </div>

                  <div className="border border-border/30 rounded-xl p-6 bg-card/30">
                    <div className="flex items-center space-x-3 mb-2">
                      <Star className="h-5 w-5 text-accent" />
                      <div className="text-3xl font-heading font-bold text-foreground">
                        {pages.filter((p) => p.isFavorite).length}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground font-medium">Favorites</div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default HomePage
