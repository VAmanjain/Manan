"use client"

import { useBlocks, useCreateBlock, useBulkUpdateBlocks, useDeleteBlock } from "../../hooks/useBlocks"
import { fromBlockNote, toBlockNote } from "../../lib/blockTransform"
import { useCreateBlockNote } from "@blocknote/react"
import { BlockNoteView } from "@blocknote/shadcn"
import { debounce } from "lodash-es"
import { useEffect, useMemo, useRef, useCallback } from "react"

interface PageEditorProps {
  pageId: string
  theme?: string
}

const PageEditor = ({ pageId, theme = "light" }: PageEditorProps) => {
  // Fetch blocks data for current page
  const { data: blocks = [], isLoading } = useBlocks(pageId)

  // Mutation hooks
  const createBlock = useCreateBlock()
  const bulkUpdate = useBulkUpdateBlocks()

  // Refs to maintain stable references
  const isUpdatingFromBackend = useRef(false)
  const blocksRef = useRef(blocks)
  const pageIdRef = useRef(pageId)

  // Keep refs updated (doesn't cause re-renders)
  blocksRef.current = blocks
  pageIdRef.current = pageId

  // Convert backend blocks to BlockNote format
  const initialContent = useMemo(() => {
    if (isLoading) return undefined
    return blocks.length > 0
      ? blocks
          .map(toBlockNote)
          .filter(
            (block): block is NonNullable<ReturnType<typeof toBlockNote>> => block !== null && block !== undefined,
          )
      : undefined
  }, [blocks, isLoading])

  // Delete block mutation
  const deleteBlock = useDeleteBlock()

  // Initialize BlockNote editor with custom delete functionality
  const editor = useCreateBlockNote({
    initialContent,
  })

  // Add keyboard shortcut for deletion
  useEffect(() => {
    if (!editor) return

    const handleDelete = async () => {
      const selection = editor.getSelection()
      if (!selection) return

      const currentBlock = selection.blocks[0]
      if (!currentBlock) return

      if (window.confirm("Are you sure you want to delete the selected block?")) {
        try {
          const transformed = fromBlockNote(currentBlock, pageId)
          await deleteBlock.mutateAsync({
            id: transformed.id,
            pageId,
          })
          editor.removeBlock(currentBlock)
        } catch (error) {
          console.error("Failed to delete block:", error)
        }
      }
    }

    // Register keyboard shortcut (Ctrl/Cmd + Delete)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Delete") {
        e.preventDefault()
        handleDelete()
      }
    }

    editor.domElement?.addEventListener("keydown", handleKeyDown)

    return () => {
      editor.domElement?.removeEventListener("keydown", handleKeyDown)
    }
  }, [editor, pageId, deleteBlock])

  // STABLE update handler - never recreated
  const handleSave = useCallback(async (doc: typeof editor.document) => {
    if (isUpdatingFromBackend.current) return

    try {
      // Get current values from refs
      const currentBlocks = blocksRef.current
      const currentPageId = pageIdRef.current

      const backendIds = new Set(currentBlocks.map((b: { id: string }) => b.id))
      const patches = doc.map((blk) => fromBlockNote(blk, currentPageId))

      // Create new blocks
      const newBlocks = patches.filter((p) => !backendIds.has(p.id))
      if (newBlocks.length > 0) {
        await Promise.all(newBlocks.map((p) => createBlock.mutateAsync(p.data as any)))
      }

      // Update existing blocks
      const existingBlocks = patches.filter((p) => backendIds.has(p.id))
      if (existingBlocks.length > 0) {
        await bulkUpdate.mutateAsync({
          updates: existingBlocks.map(({ id, data }) => ({
            id,
            data: {
              ...data,
              type: data.type as any,
            },
          })),
        })
      }
    } catch (error) {
      console.error("Error saving blocks:", error)
    }
  }, []) // ✅ EMPTY DEPENDENCIES - NEVER RECREATED

  // Create debounced version - only recreated if handleSave changes (which it never does)
  const debouncedUpdate = useMemo(() => debounce(handleSave, 2000), [handleSave])

  // Handle editor content updates from backend
  useEffect(() => {
    if (!editor || isLoading) return

    const newContent =
      blocks.length > 0
        ? blocks
            .map(toBlockNote)
            .filter(
              (block): block is NonNullable<ReturnType<typeof toBlockNote>> => block !== null && block !== undefined,
            )
        : []

    // Set flag BEFORE updating
    isUpdatingFromBackend.current = true

    try {
      editor.replaceBlocks(editor.document, newContent)
    } catch (error) {
      console.error("Error updating editor content:", error)
    }

    // Reset flag after a delay to ensure onChange doesn't fire
    setTimeout(() => {
      isUpdatingFromBackend.current = false
    }, 100) // Give enough time for the change to propagate
  }, [editor, blocks, isLoading]) // Removed pageId

  // Handle page changes
  useEffect(() => {
    debouncedUpdate.cancel() // Cancel pending saves when page changes
    isUpdatingFromBackend.current = false
  }, [pageId, debouncedUpdate])

  // Handle cleanup
  useEffect(() => {
    return () => {
      debouncedUpdate.cancel()
    }
  }, [debouncedUpdate])

  if (!editor) {
    return (
      <div className="w-full max-w-full overflow-x-hidden">
        <div className="animate-fade-in">
          <div className="card-enhanced p-8 min-h-[500px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-muted-foreground text-sm font-medium">Initializing editor...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }
  return (
    <div className="w-full max-w-full overflow-x-hidden animate-fade-in">
      <div className="card-enhanced p-6 lg:p-8 min-h-[600px] relative group">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] rounded-lg pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

        <div className="prose prose-lg max-w-none relative z-10">
          <BlockNoteView
            editor={editor}
            className="w-full max-w-full min-h-[500px] focus-within:outline-none bn-editor transition-smooth"
            onChange={() => {
              if (!isUpdatingFromBackend.current) {
                debouncedUpdate(editor.document)
              }
            }}
            theme={theme === "dark" ? "dark" : "light"}
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: "16px",
              lineHeight: "1.7",
            }}
          />
        </div>

        <div className="mt-8 pt-6 border-t border-border/50 relative">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 group/shortcut hover:text-foreground transition-smooth">
                <div className="flex items-center gap-1">
                  <kbd className="px-2 py-1 bg-muted/80 hover:bg-muted border border-border/50 rounded-md text-xs font-mono shadow-sm transition-smooth">
                    Ctrl
                  </kbd>
                  <span className="text-muted-foreground/60">+</span>
                  <kbd className="px-2 py-1 bg-muted/80 hover:bg-muted border border-border/50 rounded-md text-xs font-mono shadow-sm transition-smooth">
                    Del
                  </kbd>
                </div>
                <span className="ml-2 font-medium">Delete block</span>
              </div>

              <div className="hidden sm:flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-primary/60 rounded-full"></div>
                  {blocks.length} blocks
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-xs">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                <span className="font-medium">Auto-saved</span>
              </div>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>
        </div>
      </div>

      <div className="fixed bottom-8 right-8 z-50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none group-hover:pointer-events-auto">
        <div className="flex flex-col gap-2">
          <button
            className="w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl btn-hover focus-ring flex items-center justify-center group/fab"
            title="Focus mode"
          >
            <svg
              className="w-5 h-5 transition-transform group-hover/fab:scale-110"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default PageEditor
