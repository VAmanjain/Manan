"use client"

import type React from "react"
import { useState, useRef } from "react"
import type { Page } from "../types/api"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { toast } from "../hooks/use-toast"
import {
  MoreHorizontal,
  Star,
  Share,
  Archive,
  Trash2,
  ImageIcon,
  Smile,
  Upload,
  X,
  Loader2,
  Edit3,
  Check,
  Plus,
} from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { cn } from "../lib/utils"
import { uploadCoverImage, useCloudinaryUpload } from "../lib/cloudinary"
import IconPicker from "./ui/IconPicker"

interface PageHeaderProps {
  page: Page
  onUpdate: (updates: Partial<Page>) => Promise<void>
  isUpdating?: boolean
}

const PageHeader: React.FC<PageHeaderProps> = ({ page, onUpdate, isUpdating = false }) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [title, setTitle] = useState(page.title)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [isHoveringTitle, setIsHoveringTitle] = useState(false)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadImage } = useCloudinaryUpload()

  const handleTitleClick = () => {
    setIsEditingTitle(true)
    setTimeout(() => titleInputRef.current?.focus(), 0)
  }

  const handleTitleSubmit = async () => {
    if (title.trim() && title !== page.title) {
      try {
        await onUpdate({ title: title.trim() })
        toast({
          title: "Title updated",
          description: "Page title has been updated successfully.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to update title. Please try again.",
          variant: "destructive",
        })
        setTitle(page.title) // Reset on error
      }
    } else {
      setTitle(page.title) // Reset if empty or unchanged
    }
    setIsEditingTitle(false)
  }

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleTitleSubmit()
    } else if (e.key === "Escape") {
      setTitle(page.title)
      setIsEditingTitle(false)
    }
  }

  const handleIconSelect = async (icon: string) => {
    try {
      await onUpdate({ icon })
      toast({
        title: "Icon updated",
        description: "Page icon has been updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update icon. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleCoverImageSelect = () => {
    fileInputRef.current?.click()
  }

  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file.",
        variant: "destructive",
      })
      return
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 10MB.",
        variant: "destructive",
      })
      return
    }

    setIsUploadingCover(true)

    try {
      // Upload to Cloudinary using the utility function
      const imageUrl = await uploadCoverImage(file)

      // Update the page with the new cover image
      await onUpdate({ coverImage: imageUrl })

      toast({
        title: "Cover image updated",
        description: "Cover image has been uploaded successfully.",
      })
    } catch (error) {
      console.error("Cover upload error:", error)
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload cover image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsUploadingCover(false)
      // Clear the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveCoverImage = async () => {
    try {
      await onUpdate({ coverImage: null })
      toast({
        title: "Cover image removed",
        description: "Cover image has been removed successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove cover image. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleToggleFavorite = async () => {
    try {
      await onUpdate({ isFavorite: !page.isFavorite })
      toast({
        title: page.isFavorite ? "Removed from favorites" : "Added to favorites",
        description: `Page has been ${page.isFavorite ? "removed from" : "added to"} your favorites.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update favorite status. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleToggleArchive = async () => {
    try {
      await onUpdate({ isArchived: !page.isArchived })
      toast({
        title: page.isArchived ? "Restored from archive" : "Archived",
        description: `Page has been ${page.isArchived ? "restored from archive" : "archived"}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update archive status. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="border-b border-border bg-background">
      {page.coverImage && (
        <div className="relative h-48 lg:h-64 w-full group overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-black/30" />
          <img
            src={page.coverImage || "/placeholder.svg"}
            alt={page.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
          />

          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCoverImageSelect}
                disabled={isUploadingCover}
                className="bg-white/90 text-gray-900 hover:bg-white border-0 shadow-sm"
              >
                {isUploadingCover ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRemoveCoverImage}
                className="bg-white/90 text-gray-900 hover:bg-white hover:text-red-600 border-0 shadow-sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="px-6 py-8 lg:px-12 lg:py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            {!page.coverImage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCoverImageSelect}
                disabled={isUploadingCover}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                {isUploadingCover ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Add cover
                  </>
                )}
              </Button>
            )}

            <IconPicker
              value={page.icon}
              onChange={handleIconSelect}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50"
                >
                  <Smile className="h-4 w-4 mr-2" />
                  {page.icon ? "Change icon" : "Add icon"}
                </Button>
              }
            />
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleFavorite}
              disabled={isUpdating}
              className={cn(
                "transition-colors",
                page.isFavorite ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Star className={cn("h-4 w-4", page.isFavorite && "fill-current")} />
            </Button>

            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <Share className="h-4 w-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={isUpdating}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleToggleFavorite}>
                  <Star className="h-4 w-4 mr-3" />
                  {page.isFavorite ? "Remove from favorites" : "Add to favorites"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleToggleArchive}>
                  <Archive className="h-4 w-4 mr-3" />
                  {page.isArchived ? "Restore from archive" : "Archive page"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-3" />
                  Delete page
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex items-start gap-6">
          {page.icon ? (
            <IconPicker
              value={page.icon}
              onChange={handleIconSelect}
              trigger={
                <Button variant="ghost" className="h-16 w-16 p-0 text-4xl hover:bg-muted/50 transition-colors">
                  {page.icon}
                </Button>
              }
            />
          ) : (
            <IconPicker
              value={page.icon}
              onChange={handleIconSelect}
              trigger={
                <Button
                  variant="outline"
                  className="h-16 w-16 p-0 border-dashed border-2 text-muted-foreground hover:text-foreground hover:border-foreground/50 bg-transparent"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Plus className="h-4 w-4" />
                    <span className="text-xs">Icon</span>
                  </div>
                </Button>
              }
            />
          )}

          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="relative">
                <Input
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={handleTitleSubmit}
                  onKeyDown={handleTitleKeyDown}
                  className="text-4xl lg:text-5xl font-bold border-none p-0 h-auto bg-transparent shadow-none focus-visible:ring-1 focus-visible:ring-primary/50"
                  disabled={isUpdating}
                  placeholder="Untitled page"
                />
                <div className="absolute -right-8 top-1 text-xs text-muted-foreground">
                  <Check className="h-3 w-3" />
                </div>
              </div>
            ) : (
              <div className="group cursor-text">
                <h1
                  className="text-4xl lg:text-5xl font-bold leading-tight text-foreground hover:text-foreground/80 transition-colors px-2 py-1 -mx-2 -my-1 hover:bg-muted/30 rounded"
                  onClick={handleTitleClick}
                >
                  {page.title || "Untitled page"}
                </h1>

                <div className="absolute -right-6 top-2 opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none">
                  <Edit3 className="h-3 w-3 text-muted-foreground" />
                </div>
              </div>
            )}

            <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
              <span>Last edited {new Date(page.updatedAt).toLocaleDateString()}</span>
              {page.isPublished && (
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  <span>Published</span>
                </span>
              )}
              {page.isFavorite && (
                <span className="flex items-center gap-1 text-amber-600">
                  <Star className="w-3 h-3 fill-current" />
                  <span>Favorite</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverImageUpload} className="hidden" />
      </div>
    </div>
  )
}

export default PageHeader
