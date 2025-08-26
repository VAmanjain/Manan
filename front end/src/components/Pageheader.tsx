"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import type { Page } from "../types/api"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { toast } from "../hooks/use-toast"
import { Star, ImageIcon, Smile, Upload, X, Loader2, Edit3, Check, Plus, Link, Search } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { uploadCoverImage, useCloudinaryUpload } from "../lib/cloudinary"
import IconPicker from "./ui/IconPicker"

// Unsplash API types
interface UnsplashImage {
  id: string
  urls: {
    small: string
    regular: string
    full: string
  }
  alt_description: string | null
  user: {
    name: string
    username: string
  }
  links: {
    html: string
  }
}

interface UnsplashResponse {
  results: UnsplashImage[]
  total: number
}

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
  const [isCoverDialogOpen, setIsCoverDialogOpen] = useState(false)
  const [imageUrl, setImageUrl] = useState("")
  const [isValidatingUrl, setIsValidatingUrl] = useState(false)
  const [unsplashQuery, setUnsplashQuery] = useState("")
  const [unsplashImages, setUnsplashImages] = useState<UnsplashImage[]>([])
  const [isSearchingUnsplash, setIsSearchingUnsplash] = useState(false)
  const [unsplashPage, setUnsplashPage] = useState(1)

  const titleInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { uploadImage } = useCloudinaryUpload()

  // Your Unsplash Access Key - Replace with your actual key
  const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_UNSPLASH_ACCESS_KEY || ""

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
      setIsCoverDialogOpen(false)
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

  const validateImageUrl = async (url: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(true)
      img.onerror = () => resolve(false)
      img.src = url

      // Timeout after 5 seconds
      setTimeout(() => resolve(false), 5000)
    })
  }

  const handleUrlSubmit = async () => {
    if (!imageUrl.trim()) {
      toast({
        title: "Empty URL",
        description: "Please enter a valid image URL.",
        variant: "destructive",
      })
      return
    }

    setIsValidatingUrl(true)

    try {
      const isValid = await validateImageUrl(imageUrl.trim())

      if (!isValid) {
        toast({
          title: "Invalid URL",
          description: "The provided URL does not point to a valid image.",
          variant: "destructive",
        })
        return
      }

      await onUpdate({ coverImage: imageUrl.trim() })

      toast({
        title: "Cover image updated",
        description: "Cover image has been updated from URL successfully.",
      })

      setImageUrl("")
      setIsCoverDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cover image. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsValidatingUrl(false)
    }
  }

  const searchUnsplash = async (query: string, page = 1) => {
    if (!query.trim()) return

    setIsSearchingUnsplash(true)

    try {
      const response = await fetch(
        `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&page=${page}&per_page=20&orientation=landscape`,
        {
          headers: {
            Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
          },
        },
      )

      if (!response.ok) {
        throw new Error("Failed to search Unsplash")
      }

      const data: UnsplashResponse = await response.json()

      if (page === 1) {
        setUnsplashImages(data.results)
      } else {
        setUnsplashImages((prev) => [...prev, ...data.results])
      }

      setUnsplashPage(page)
    } catch (error) {
      console.error("Unsplash search error:", error)
      toast({
        title: "Search failed",
        description: "Failed to search Unsplash. Please check your API key and try again.",
        variant: "destructive",
      })
    } finally {
      setIsSearchingUnsplash(false)
    }
  }

  const handleUnsplashSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (unsplashQuery.trim()) {
      searchUnsplash(unsplashQuery.trim(), 1)
    }
  }

  const handleSelectUnsplashImage = async (image: UnsplashImage) => {
    try {
      // Use the regular size URL for better quality
      await onUpdate({ coverImage: image.urls.regular })

      // Trigger download for Unsplash API guidelines
      fetch(`https://api.unsplash.com/photos/${image.id}/download`, {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }).catch(() => {}) // Silent fail for download tracking

      toast({
        title: "Cover image updated",
        description: `Cover image from ${image.user.name} has been set successfully.`,
      })

      setIsCoverDialogOpen(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update cover image. Please try again.",
        variant: "destructive",
      })
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

  useEffect(() => {
    if (isCoverDialogOpen && !unsplashImages.length && UNSPLASH_ACCESS_KEY) {
      searchUnsplash("abstract", 1)
    }
  }, [isCoverDialogOpen])

  return (
    <div className="border-b border-border w-full bg-background">
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
              <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-white/90 text-gray-900 hover:bg-white border-0 shadow-sm"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
              </Dialog>
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

      <div className="px-6 py-6 lg:px-12 lg:py-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            {!page.coverImage && (
              <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    Add cover
                  </Button>
                </DialogTrigger>
              </Dialog>
            )}

            <IconPicker
              value={page.icon}
              onChange={handleIconSelect}
              trigger={
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
                >
                  <Smile className="h-4 w-4 mr-2" />
                  {page.icon ? "Change icon" : "Add icon"}
                </Button>
              }
            />
          </div>
        </div>

        <div className="flex items-start gap-8">
          {page.icon ? (
            <IconPicker
              value={page.icon}
              onChange={handleIconSelect}
              trigger={
                <Button
                  variant="ghost"
                  className="h-20 w-20 p-0 text-5xl hover:bg-transparent hover:scale-110 transition-all duration-200 border-none shadow-none"
                >
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
                  className="h-20 w-20 p-0 border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 hover:bg-muted/20 bg-transparent transition-all duration-200 rounded-lg"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Plus className="h-5 w-5" />
                    <span className="text-xs font-medium">Icon</span>
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
                  className="text-4xl lg:text-5xl font-bold border-none p-0 h-auto bg-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus:outline-none"
                  disabled={isUpdating}
                  placeholder="Untitled page"
                />
                <div className="absolute -right-10 top-2 text-muted-foreground/60">
                  <Check className="h-4 w-4" />
                </div>
              </div>
            ) : (
              <div className="group cursor-text relative">
                <h1
                  className="text-4xl lg:text-5xl font-bold leading-tight text-foreground hover:text-foreground/80 transition-colors px-3 py-2 -mx-3 -my-2 hover:bg-muted/20 rounded-md"
                  onClick={handleTitleClick}
                >
                  {page.title || "Untitled page"}
                </h1>

                <div className="absolute -right-8 top-3 opacity-0 group-hover:opacity-60 transition-opacity pointer-events-none">
                  <Edit3 className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center gap-6 text-sm text-muted-foreground">
              <span>Last edited {new Date(page.updatedAt).toLocaleDateString()}</span>
              {page.isPublished && (
                <span className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-green-600 font-medium">Published</span>
                </span>
              )}
              {page.isFavorite && (
                <span className="flex items-center gap-2 text-amber-600">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="font-medium">Favorite</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cover Image Dialog */}
        <Dialog open={isCoverDialogOpen} onOpenChange={setIsCoverDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Add Cover Image</DialogTitle>
              <DialogDescription>Choose how you'd like to add a cover image to your page</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="unsplash" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="unsplash" className="flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Unsplash
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="url" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  URL
                </TabsTrigger>
              </TabsList>

              <TabsContent value="unsplash" className="space-y-4">
                <form onSubmit={handleUnsplashSearch} className="flex gap-2">
                  <Input
                    placeholder="Search for images..."
                    value={unsplashQuery}
                    onChange={(e) => setUnsplashQuery(e.target.value)}
                    className="focus-visible:ring-1 focus-visible:ring-primary/50"
                  />
                  <Button type="submit" disabled={isSearchingUnsplash}>
                    {isSearchingUnsplash ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </form>

                {unsplashImages.length > 0 && (
                  <div className="max-h-96 overflow-y-auto">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {unsplashImages.map((image) => (
                        <div
                          key={image.id}
                          className="relative group cursor-pointer rounded-xl overflow-hidden bg-muted shadow-sm hover:shadow-md transition-all duration-200"
                          onClick={() => handleSelectUnsplashImage(image)}
                        >
                          <img
                            src={image.urls.small || "/placeholder.svg"}
                            alt={image.alt_description || "Unsplash image"}
                            className="w-full h-28 object-cover transition-transform group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button size="sm" variant="secondary" className="shadow-lg">
                              Select
                            </Button>
                          </div>
                          <div className="absolute bottom-2 left-2 text-xs text-white/90 bg-black/60 px-2 py-1 rounded-md backdrop-blur-sm">
                            {image.user.name}
                          </div>
                        </div>
                      ))}
                    </div>

                    {unsplashImages.length >= 20 && (
                      <div className="text-center mt-6">
                        <Button
                          variant="outline"
                          onClick={() => searchUnsplash(unsplashQuery, unsplashPage + 1)}
                          disabled={isSearchingUnsplash}
                          className="hover:bg-muted/50"
                        >
                          {isSearchingUnsplash ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          Load More
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground">
                  Photos from{" "}
                  <a
                    href="https://unsplash.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:no-underline"
                  >
                    Unsplash
                  </a>
                </p>
              </TabsContent>

              <TabsContent value="upload" className="space-y-4">
                <div className="text-center py-8">
                  <Button
                    onClick={handleCoverImageSelect}
                    disabled={isUploadingCover}
                    className="h-32 w-full border-2 border-dashed border-muted-foreground/25 bg-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all duration-200"
                    variant="outline"
                  >
                    {isUploadingCover ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8" />
                        <span>Click to upload an image</span>
                        <span className="text-sm text-muted-foreground">Supports JPG, PNG, GIF up to 10MB</span>
                      </div>
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="url" className="space-y-4">
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste image URL here..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
                      className="focus-visible:ring-1 focus-visible:ring-primary/50"
                    />
                    <Button onClick={handleUrlSubmit} disabled={isValidatingUrl || !imageUrl.trim()}>
                      {isValidatingUrl ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enter a direct link to an image (e.g., https://example.com/image.jpg)
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverImageUpload} className="hidden" />
      </div>
    </div>
  )
}

export default PageHeader
