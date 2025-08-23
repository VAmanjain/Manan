import { useAllPages, useCreatePage } from "../hooks/usePages" // Fixed import
import { useNavigate, useParams } from "react-router-dom"
import { Plus, Search, FileText, Settings, Moon, Sun } from "lucide-react"
import { useState } from "react"
import { UserButton, SignedOut, SignedIn, SignInButton, useUser } from "@clerk/clerk-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import ThemeToggle from "./ThemeToggle"

interface Page {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

interface SidebarProps {
  theme: string
  onThemeToggle: () => void
}

export default function Sidebar({ theme = "light", onThemeToggle }: SidebarProps) {
  const { data: pages = [], isLoading, error } = useAllPages() // Fixed hook name
  const createPage = useCreatePage()
  const nav = useNavigate()
  const { id: currentPageId } = useParams<{ id: string }>()
  const [creating, setCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const { user } = useUser()

  const handleCreate = async () => {
    setCreating(true)
    try {
      // Fixed: Pass object with title property instead of just string
      const res = await createPage.mutateAsync({ title: "Untitled" })
      nav(`/pages/${res.id}`) // Fixed: Consistent navigation path
    } catch (error) {
      console.error("Failed to create page:", error)
    } finally {
      setCreating(false)
    }
  }

  const filteredPages = pages.filter((page: Page) => page.title.toLowerCase().includes(searchTerm.toLowerCase()))

  const isDark = theme === "dark"
  const sidebarClasses = `w-full h-full ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"} flex flex-col`

  return (
    <aside className={sidebarClasses}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}>
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-semibold">Workspace</h1>
          <div className="flex items-center gap-2">
            {onThemeToggle && (
              <button
                onClick={onThemeToggle}
                className={`p-1.5 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-600"
                }`}
                title="Toggle theme"
              >
                {isDark ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
            <button
              onClick={handleCreate}
              disabled={creating}
              className={`p-1.5 rounded-lg transition-colors ${
                isDark ? "hover:bg-gray-700 text-gray-300" : "hover:bg-gray-200 text-gray-600"
              } disabled:opacity-50`}
              title="New page"
            >
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              isDark ? "text-gray-400" : "text-gray-500"
            }`}
          />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
              isDark
                ? "bg-gray-800 border-gray-600 text-white placeholder-gray-400"
                : "bg-white border-gray-200 text-gray-900 placeholder-gray-500"
            } focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-md scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        <div className="p-4 space-y-6">
          {/* Quick Actions */}
          <div>
            <h3
              className={`text-xs font-medium uppercase tracking-wide mb-3 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Quick Actions
            </h3>
            <div className="space-y-1">
              <button
                onClick={handleCreate}
                disabled={creating}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"
                } disabled:opacity-50`}
              >
                <Plus size={16} />
                <span className="text-sm">{creating ? "Creating..." : "New Page"}</span>
              </button>
            </div>
          </div>

          {/* Pages */}
          <div>
            <h3
              className={`text-xs font-medium uppercase tracking-wide mb-3 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Pages ({filteredPages.length})
            </h3>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={`h-8 rounded-lg animate-pulse ${isDark ? "bg-gray-800" : "bg-gray-200"}`} />
                ))}
              </div>
            ) : error ? (
              <div className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>Failed to load pages</div>
            ) : filteredPages.length === 0 ? (
              <div className={`text-sm ${isDark ? "text-gray-500" : "text-gray-400"}`}>
                {searchTerm ? "No pages found" : "No pages yet"}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredPages.map((page: Page) => (
                  <button
                    key={page.id}
                    onClick={() => nav(`/pages/${page.id}`)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                      currentPageId === page.id
                        ? isDark
                          ? "bg-blue-600 text-white"
                          : "bg-blue-100 text-blue-900"
                        : isDark
                          ? "hover:bg-gray-800 text-gray-300"
                          : "hover:bg-gray-100 text-gray-700"
                    }`}
                  >
                    <FileText size={16} className="flex-shrink-0" />
                    <span className="text-sm truncate">{page.title || "Untitled"}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className={`p-4 border-t ${isDark ? "border-gray-700" : "border-gray-200"} flex-shrink-0`}>
        <button
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
            isDark ? "hover:bg-gray-800 text-gray-300" : "hover:bg-gray-100 text-gray-700"
          }`}
        >
          <Settings size={16} />
          {/* <span className="text-sm">Settings</span> */}

          <div className="flex items-center gap-3 md:gap-4">
        <div className="flex items-center">
          <SignedIn>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-smooth focus-ring">
                  <UserButton
                    appearance={{
                      elements: {
                        avatarBox: "w-8 h-8 md:w-10 md:h-10",
                        userButtonPopoverCard: "hidden", // Hide default popover
                      },
                    }}
                  />
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-foreground">
                      {user?.firstName || user?.username || "User"}
                    </div>
                    <div className="text-xs text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</div>
                  </div>
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.firstName || user?.username || "User"}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.primaryEmailAddress?.emailAddress}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                    />
                  </svg>
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  My Documents
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer text-destructive focus:text-destructive"
                  onClick={() => {
                    // Trigger Clerk's sign out
                    window.Clerk?.signOut()
                  }}
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                    />
                  </svg>
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SignedIn>
          <SignedOut>
            <SignInButton>
              <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm md:text-base font-medium animate-pulse-glow">
                Sign In
              </button>
            </SignInButton>
          </SignedOut>
        </div>
      </div>
        </button>
      </div>
    </aside>
  )
}
