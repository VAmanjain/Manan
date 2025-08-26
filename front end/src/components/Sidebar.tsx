"use client";

import type React from "react";
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { toggleSidebar } from "../store/slices/pageSlice";
import { usePages, useCreatePage, useDeletePage } from "../hooks/useApi";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import {
  FileText,
  Plus,
  ChevronLeft,
  ChevronRight,
  Home,
  Search,
  Trash2,
} from "lucide-react";
import { cn } from "../lib/utils";
import { UserButton } from "@clerk/clerk-react";

const Sidebar: React.FC = () => {
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const { sidebarCollapsed } = useSelector((state: RootState) => state.pages);
  const { data: pages = [], isLoading } = usePages();
  const createPageMutation = useCreatePage();
  const deletePageMutation = useDeletePage();
  const [hoveredPageId, setHoveredPageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPages = pages.filter((page) =>
    page.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCreatePage = async () => {
    try {
      const newPage = await createPageMutation.mutateAsync({
        title: "Untitled",
      });
      navigate(`/page/${newPage.id}`);
    } catch (error) {
      console.error("Failed to create page:", error);
    }
  };

  const handleDeletePage = async (
    pageId: string,
    pageTitle: string,
    event: React.MouseEvent
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (
      window.confirm(
        `Are you sure you want to delete "${pageTitle}"? This action cannot be undone.`
      )
    ) {
      try {
        await deletePageMutation.mutateAsync(pageId);

        if (location.pathname === `/page/${pageId}`) {
          navigate("/home");
        }
      } catch (error) {
        console.error("Failed to delete page:", error);
        alert("Failed to delete page. Please try again.");
      }
    }
  };

  const handleToggleSidebar = () => {
    dispatch(toggleSidebar());
  };

  return (
    <div
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-background transition-all duration-300 border-r border-border",
        sidebarCollapsed ? "w-20" : "w-64"
      )}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {!sidebarCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                <FileText className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-lg text-foreground">
                Manan
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleSidebar}
            className={cn(
              "hover:bg-muted transition-colors rounded-xl",
              sidebarCollapsed ? "w-full" : "ml-auto"
            )}
          >
            {sidebarCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {/* Navigation */}
          <div className="p-4 space-y-1">
            <Link to="/home">
              <div
                className={cn(
                  "flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  sidebarCollapsed && "justify-center",
                  location.pathname === "/home"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <Home className="h-4 w-4" />
                {!sidebarCollapsed && <span className="ml-3">Home</span>}
              </div>
            </Link>
          </div>

          <div className="px-4 pb-2">
            {!sidebarCollapsed ? (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search pages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-9 rounded-xl border-border bg-muted/50 focus:bg-background transition-colors"
                />
              </div>
            ) : (
              <div className="flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-10 h-10 hover:bg-muted transition-colors rounded-xl"
                >
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Pages Header */}
          {!sidebarCollapsed && (
            <div className="px-4 py-2">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Pages {searchQuery && `(${filteredPages.length})`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 hover:bg-muted transition-colors rounded-lg"
                  onClick={handleCreatePage}
                  disabled={createPageMutation.isPending}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Pages List */}
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-1">
              {isLoading ? (
                <div className="p-3 text-sm text-muted-foreground">
                  {sidebarCollapsed ? "" : "Loading..."}
                </div>
              ) : filteredPages.length === 0 ? (
                !sidebarCollapsed && (
                  <div className="p-3 text-sm text-muted-foreground">
                    {searchQuery ? "No pages found" : "No pages yet"}
                  </div>
                )
              ) : (
                filteredPages.map((page) => (
                  <div
                    key={page.id}
                    className="relative group"
                    onMouseEnter={() => setHoveredPageId(page.id)}
                    onMouseLeave={() => setHoveredPageId(null)}
                  >
                    <Link to={`/page/${page.id}`}>
                      <div
                        className={cn(
                          "flex items-center px-3 py-2.5 rounded-xl text-sm transition-colors",
                          sidebarCollapsed && "justify-center",
                          location.pathname === `/page/${page.id}`
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          !sidebarCollapsed &&
                            hoveredPageId === page.id &&
                            "pr-10"
                        )}
                      >
                        {page.icon ? (
                          <span className="text-xl flex-shrink-0">
                            {page.icon}
                          </span>
                        ) : (
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        )}
                        {!sidebarCollapsed && (
                          <span className="ml-2 truncate font-medium">
                            {page.title}
                          </span>
                        )}
                      </div>
                    </Link>

                    {!sidebarCollapsed && hoveredPageId === page.id && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all rounded-lg"
                        onClick={(e) =>
                          handleDeletePage(page.id, page.title, e)
                        }
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

          {/* Collapsed Create Button */}
          {sidebarCollapsed && (
            <div className="p-3">
              <Button
                variant="ghost"
                size="icon"
                className="w-full hover:bg-muted transition-colors rounded-xl"
                onClick={handleCreatePage}
                disabled={createPageMutation.isPending}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="border-t border-border p-4">
          <div
            className={cn(
              "flex items-center",
              sidebarCollapsed ? "justify-center" : "justify-end"
            )}
          >
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 rounded-xl",
                },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
