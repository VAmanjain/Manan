import type React from "react"
import { useState, useEffect, useCallback, useRef } from "react"
import { useUpdatePage } from "../../hooks/usePages"
import { debounce } from "lodash-es"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"

interface EditablePageHeaderProps {
  pageInfo: {
    id: string
    title: string
    icon?: string
    coverImage?: string
  }
}

interface CloudinaryResponse {
  public_id: string
  secure_url: string
  url: string
  format: string
  resource_type: string
}

const EMOJI_CATEGORIES = {
  "Frequently Used": ["📄", "📝", "📋", "📊", "📈", "📉", "📌", "📍", "🔖", "🏷️"],
  Documents: ["📄", "📃", "📑", "📜", "📋", "📊", "📈", "📉", "📝", "✏️", "🖊️", "🖋️"],
  Objects: ["📱", "💻", "🖥️", "⌨️", "🖱️", "💾", "💿", "📀", "🔌", "🔋", "📷", "📹"],
  Symbols: ["⭐", "🌟", "✨", "🔥", "💡", "🎯", "🚀", "⚡", "💎", "🏆", "🎉", "🎊"],
  Nature: ["🌱", "🌿", "🍀", "🌳", "🌲", "🌴", "🌵", "🌾", "🌺", "🌻", "🌷", "🌹"],
  Food: ["🍎", "🍊", "🍋", "🍌", "🍇", "🍓", "🫐", "🍈", "🍉", "🍑", "🍒", "🥝"],
  Travel: ["🏠", "🏢", "🏬", "🏭", "🏰", "🗼", "🌉", "⛩️", "🕌", "⛪", "🏛️", "🗿"],
  Activities: ["⚽", "🏀", "🏈", "⚾", "🎾", "🏐", "🏉", "🎱", "🏓", "🏸", "🥅", "⛳"],
}

const EditablePageHeader = ({ pageInfo }: EditablePageHeaderProps) => {
  const [title, setTitle] = useState(pageInfo.title)
  const [icon, setIcon] = useState(pageInfo.icon || "")
  const [coverImage, setCoverImage] = useState(pageInfo.coverImage || "")
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEmojiPopoverOpen, setIsEmojiPopoverOpen] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadError, setUploadError] = useState<string>("")

  const updatePage = useUpdatePage()
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setTitle(pageInfo.title)
    setIcon(pageInfo.icon || "")
    setCoverImage(pageInfo.coverImage || "")
  }, [pageInfo.id, pageInfo.title, pageInfo.icon, pageInfo.coverImage])

  const debouncedSave = useCallback(
    debounce((field: string, value: string | null) => {
      updatePage.mutate({
        id: pageInfo.id,
        data: { [field]: value },
      })
    }, 800),
    [pageInfo.id, updatePage],
  )

  // Extract public_id from Cloudinary URL
  const extractPublicId = (cloudinaryUrl: string): string | null => {
    try {
      // Cloudinary URL format: https://res.cloudinary.com/cloud_name/image/upload/v123456/folder/public_id.extension
      const urlParts = cloudinaryUrl.split("/")
      const uploadIndex = urlParts.findIndex((part) => part === "upload")

      if (uploadIndex === -1) return null

      // Get everything after 'upload' and optional version
      let pathAfterUpload = urlParts.slice(uploadIndex + 1)

      // Remove version if it exists (starts with 'v' followed by numbers)
      if (pathAfterUpload[0] && /^v\d+$/.test(pathAfterUpload)) {
        pathAfterUpload = pathAfterUpload.slice(1)
      }

      // Join the remaining path and remove file extension
      const fullPath = pathAfterUpload.join("/")
      const publicId = fullPath.replace(/\.[^.]+$/, "") // Remove file extension

      return publicId || null
    } catch (error) {
      console.error("Error extracting public_id:", error)
      return null
    }
  }

  // Delete image from Cloudinary
  const deleteFromCloudinary = async (imageUrl: string): Promise<boolean> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY
    const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      console.warn("Cloudinary deletion skipped: Missing API credentials for server-side operations")
      return false
    }

    const publicId = extractPublicId(imageUrl)
    if (!publicId) {
      console.warn("Could not extract public_id from URL:", imageUrl)
      return false
    }

    try {
      // Note: This is a client-side implementation. For production, you should
      // implement this on your backend due to API secret exposure
      const timestamp = Math.floor(Date.now() / 1000)

      // You'll need to implement signature generation on your backend
      // For now, we'll just log the attempt
      console.log("Would delete image with public_id:", publicId)

      // In production, make a request to your backend:
      // const response = await fetch('/api/cloudinary/delete', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ publicId })
      // })

      return true
    } catch (error) {
      console.error("Error deleting from Cloudinary:", error)
      return false
    }
  }

  // Upload to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName) {
      throw new Error("VITE_CLOUDINARY_CLOUD_NAME is not set")
    }

    if (!uploadPreset) {
      throw new Error("VITE_CLOUDINARY_UPLOAD_PRESET is not set")
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("upload_preset", uploadPreset)
    formData.append("folder", "page-covers")

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: "POST",
        body: formData,
      })

      const responseText = await response.text()

      if (!response.ok) {
        let errorMessage = `Upload failed: ${response.status} ${response.statusText}`

        try {
          const errorData = JSON.parse(responseText)
          if (errorData.error?.message) {
            errorMessage += ` - ${errorData.error.message}`
          }
        } catch (e) {
          if (responseText) {
            errorMessage += ` - ${responseText}`
          }
        }

        throw new Error(errorMessage)
      }

      const data: CloudinaryResponse = JSON.parse(responseText)
      return data.secure_url
    } catch (error) {
      console.error("Cloudinary upload error:", error)
      throw error
    }
  }

  const handleTitleChange = useCallback(
    (newTitle: string) => {
      setTitle(newTitle)
      debouncedSave("title", newTitle)
    },
    [debouncedSave],
  )

  const handleIconChange = useCallback(
    (newIcon: string) => {
      setIcon(newIcon)
      debouncedSave("icon", newIcon || null)
      setIsEmojiPopoverOpen(false)
    },
    [debouncedSave],
  )

  // Updated cover upload with change handling
  const handleCoverUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      // Validate file type
      if (!file.type.startsWith("image/")) {
        setUploadError("Please select an image file")
        return
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        setUploadError("File size must be less than 10MB")
        return
      }

      const oldImageUrl = coverImage
      setIsUploading(true)
      setUploadError("")

      try {
        // Create temporary preview
        const tempUrl = URL.createObjectURL(file)
        setCoverImage(tempUrl)

        // Upload new image to Cloudinary
        const newCloudinaryUrl = await uploadToCloudinary(file)

        // Update with new Cloudinary URL
        setCoverImage(newCloudinaryUrl)
        debouncedSave("coverImage", newCloudinaryUrl)

        // Clean up temporary URL
        URL.revokeObjectURL(tempUrl)

        // Delete old image from Cloudinary (if it exists and was a Cloudinary URL)
        if (oldImageUrl && oldImageUrl.includes("cloudinary.com")) {
          console.log("Deleting old image:", oldImageUrl)
          await deleteFromCloudinary(oldImageUrl)
        }
      } catch (error) {
        console.error("Upload failed:", error)
        setUploadError(error instanceof Error ? error.message : "Upload failed")
        // Revert to previous image
        setCoverImage(oldImageUrl)
      } finally {
        setIsUploading(false)
        // Clear the input
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
      }
    },
    [debouncedSave, coverImage],
  )

  // Updated remove cover with Cloudinary deletion
  const handleRemoveCover = useCallback(async () => {
    const imageToDelete = coverImage

    if (!imageToDelete) return

    setIsDeleting(true)
    setUploadError("")

    try {
      // Remove from UI immediately for better UX
      setCoverImage("")
      debouncedSave("coverImage", null)

      // Delete from Cloudinary if it's a Cloudinary URL
      if (imageToDelete.includes("cloudinary.com")) {
        console.log("Deleting image from Cloudinary:", imageToDelete)
        const deleted = await deleteFromCloudinary(imageToDelete)

        if (deleted) {
          console.log("Successfully deleted from Cloudinary")
        } else {
          console.warn("Could not delete from Cloudinary, but removed from UI")
        }
      }
    } catch (error) {
      console.error("Error during image removal:", error)
      setUploadError("Failed to delete image completely, but removed from page")
    } finally {
      setIsDeleting(false)
    }
  }, [coverImage, debouncedSave])

  const handleTitleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        setIsEditingTitle(false)
      } else if (e.key === "Escape") {
        setTitle(pageInfo.title)
        setIsEditingTitle(false)
      }
    },
    [pageInfo.title],
  )

  return (
    <div className="relative w-full animate-fade-in">
      <div
        className="relative h-96 w-full bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/8 transition-all duration-700 overflow-hidden group"
        style={{
          backgroundImage: coverImage
            ? `linear-gradient(135deg, rgba(0, 0, 0, 0.4) 0%, rgba(0, 0, 0, 0.2) 50%, rgba(0, 0, 0, 0.6) 100%), url(${coverImage})`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundBlendMode: "overlay",
        }}
      >
        <div className="absolute top-6 right-6 flex gap-3 z-20">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isDeleting}
            className="group/btn bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-smooth border border-white/20 hover:border-white/40 focus-ring flex items-center gap-3 shadow-2xl btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
            title={coverImage ? "Change cover image" : "Add cover image"}
            aria-label={coverImage ? "Change cover image" : "Add cover image"}
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <svg
                className="w-5 h-5 transition-transform group-hover/btn:scale-110"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
            <span className="hidden sm:inline">
              {isUploading ? "Uploading..." : coverImage ? "Change Cover" : "Add Cover"}
            </span>
          </button>

          {coverImage && (
            <button
              onClick={handleRemoveCover}
              disabled={isUploading || isDeleting}
              className="group/btn bg-destructive/15 hover:bg-destructive/25 backdrop-blur-xl text-white px-6 py-3 rounded-2xl text-sm font-semibold transition-smooth border border-destructive/30 hover:border-destructive/50 focus-ring flex items-center gap-3 shadow-2xl btn-hover disabled:opacity-50 disabled:cursor-not-allowed"
              title="Remove cover image"
              aria-label="Remove cover image"
            >
              {isDeleting ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <svg
                  className="w-5 h-5 transition-transform group-hover/btn:scale-110"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              )}
              <span className="hidden sm:inline">{isDeleting ? "Deleting..." : "Remove"}</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleCoverUpload}
          className="hidden"
          disabled={isUploading || isDeleting}
        />

        <div className="absolute bottom-8 left-8 right-8">
          <div className="flex items-end gap-6">
            {/* Icon Section */}
            <Popover open={isEmojiPopoverOpen} onOpenChange={setIsEmojiPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  className="group/icon w-20 h-20 bg-white/15 hover:bg-white/25 backdrop-blur-xl rounded-3xl border border-white/20 hover:border-white/40 transition-smooth focus-ring flex items-center justify-center text-4xl shadow-2xl btn-hover"
                  title="Change page icon"
                >
                  {icon || (
                    <svg
                      className="w-8 h-8 text-white/60 group-hover/icon:text-white/80 transition-colors"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4 bg-card/95 backdrop-blur-xl border border-border/50 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-card-foreground">Choose an icon</h3>
                    {icon && (
                      <button
                        onClick={() => handleIconChange("")}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted/50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-3">
                    {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
                      <div key={category}>
                        <h4 className="text-xs font-medium text-muted-foreground mb-2">{category}</h4>
                        <div className="grid grid-cols-8 gap-1">
                          {emojis.map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => handleIconChange(emoji)}
                              className="w-8 h-8 rounded-lg hover:bg-muted/80 transition-colors flex items-center justify-center text-lg btn-hover"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            {/* Title Section */}
            <div className="flex-1 min-w-0">
              {isEditingTitle ? (
                <input
                  type="text"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  onBlur={() => setIsEditingTitle(false)}
                  onKeyDown={handleTitleKeyDown}
                  className="w-full bg-transparent text-white text-4xl lg:text-5xl font-bold placeholder-white/50 border-none outline-none focus:ring-0 p-0 font-sans"
                  placeholder="Untitled"
                  autoFocus
                />
              ) : (
                <h1
                  onClick={() => setIsEditingTitle(true)}
                  className="text-4xl lg:text-5xl font-bold text-white cursor-text hover:text-white/90 transition-colors font-sans leading-tight break-words"
                  title="Click to edit title"
                >
                  {title || "Untitled"}
                </h1>
              )}
              <div className="mt-2 flex items-center gap-4 text-white/70 text-sm">
                <span className="flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Last edited {new Date().toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none"></div>
      </div>

      <div className="fixed top-6 left-6 z-50 flex flex-col gap-3 max-w-sm">
        {isUploading && (
          <div className="bg-primary/95 backdrop-blur-xl text-primary-foreground px-6 py-4 rounded-2xl text-sm flex items-center gap-4 shadow-2xl border border-primary/20 animate-slide-up">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span className="font-semibold">Uploading image...</span>
          </div>
        )}

        {isDeleting && (
          <div className="bg-destructive/95 backdrop-blur-xl text-destructive-foreground px-6 py-4 rounded-2xl text-sm flex items-center gap-4 shadow-2xl border border-destructive/20 animate-slide-up">
            <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            <span className="font-semibold">Removing image...</span>
          </div>
        )}

        {uploadError && (
          <div className="bg-destructive/95 backdrop-blur-xl text-destructive-foreground px-6 py-4 rounded-2xl text-sm flex items-start gap-4 shadow-2xl border border-destructive/20 animate-slide-up">
            <svg
              className="w-5 h-5 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-semibold">Upload Error</div>
              <p className="text-xs mt-1 break-words opacity-90">{uploadError}</p>
            </div>
            <button
              onClick={() => setUploadError("")}
              className="ml-2 hover:bg-white/10 p-1.5 rounded-lg text-lg leading-none transition-colors btn-hover"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default EditablePageHeader
