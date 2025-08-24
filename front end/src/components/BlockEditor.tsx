"use client"

import type React from "react"
import { useMemo, useCallback, useRef, useEffect, useState } from "react"
import { BlockNoteView } from "@blocknote/mantine"
import { useCreateBlockNote } from "@blocknote/react"
import {
  useBlocks,
  useCreateBlock,
  useUpdateBlock,
  useDeleteBlock,
  mapBlockNoteTypeToAPI,
  hasBlockChanged,
} from "../hooks/useApi"
import { useDispatch, useSelector } from "react-redux"
import type { RootState } from "../store/store"
import { setBlocks } from "../store/slices/editorSlice"
import { Loader2, Clock, CheckCircle2, AlertCircle, Wand2, Sparkles } from "lucide-react"
import { cn } from "../lib/utils"
import "@blocknote/core/fonts/inter.css"
import "@blocknote/mantine/style.css"
import RephraseModal from "./RephraseModel"
import AIContentModal from "./AIContentModal"

// Debounce utility function
const debounce = <T extends (...args: any[]) => any>(func: T, wait: number): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => func(...args), wait)
  }
}

// AI Service types
interface RephraseRequest {
  text: string
  style: "formal" | "casual" | "creative" | "concise"
  preserve_meaning?: boolean
  max_tokens?: number
  temperature?: number
}

interface RephraseResponse {
  original_text: string
  rephrased_text: string
  style: string
  processing_time: number
  tokens_used?: number
}

interface ContentGenerationResponse {
  generated_content: string
  prompt: string
  type: string
  processing_time: number
  tokens_used?: number
}

interface ContentGenerationRequest {
  prompt: string
  context?: string
  type: "continue" | "expand" | "new" | "brainstorm" | "outline" | "summarize"
  tone?: "professional" | "casual" | "creative" | "academic" | "persuasive"
  length?: "short" | "medium" | "long"
  max_tokens?: number
  temperature?: number
}

// AI Service class
class AIService {
  private baseURL: string

  constructor(baseURL = "http://localhost:8000") {
    this.baseURL = baseURL
  }

  private async makeRequest<T>(endpoint: string, body: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Request failed with status ${response.status}`)
      }

      return response.json()
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new Error("Unable to connect to AI service. Please check your connection.")
      }
      throw error
    }
  }

  async rephrase(request: RephraseRequest): Promise<RephraseResponse> {
    return this.makeRequest<RephraseResponse>("/rephrase", request)
  }

  async generateContent(request: ContentGenerationRequest): Promise<ContentGenerationResponse> {
    return this.makeRequest<ContentGenerationResponse>("/generate-content", request)
  }

  async getStyles(): Promise<{
    styles: Array<{ key: string; name: string; description: string }>
  }> {
    const response = await fetch(`${this.baseURL}/styles`)
    if (!response.ok) {
      return {
        styles: [
          { key: "formal", name: "Formal", description: "Professional tone" },
          { key: "casual", name: "Casual", description: "Conversational tone" },
          {
            key: "creative",
            name: "Creative",
            description: "Expressive style",
          },
          { key: "concise", name: "Concise", description: "Brief and direct" },
        ],
      }
    }
    return response.json()
  }

  async getContentTypes(): Promise<{
    types: Array<{ key: string; name: string; description: string }>
  }> {
    const response = await fetch(`${this.baseURL}/content-types`)
    if (!response.ok) {
      return {
        types: [
          {
            key: "new",
            name: "New Content",
            description: "Create new content",
          },
          {
            key: "continue",
            name: "Continue",
            description: "Continue writing",
          },
          { key: "expand", name: "Expand", description: "Expand ideas" },
        ],
      }
    }
    return response.json()
  }
}

// Main BlockNote Editor Component
interface BlockNoteEditorProps {
  pageId: string
}

const BlockNoteEditor: React.FC<BlockNoteEditorProps> = ({ pageId }) => {
  const dispatch = useDispatch()
  const { blocks } = useSelector((state: RootState) => state.editor)
  const isSavingRef = useRef(false)
  const editorRef = useRef<any>(null)
  const hasInitializedRef = useRef(false)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<any[] | null>(null)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // AI modal states
  const [isAIContentModalOpen, setIsAIContentModalOpen] = useState(false)
  const [isRephraseModalOpen, setIsRephraseModalOpen] = useState(false)
  const [selectedTextForRephrase, setSelectedTextForRephrase] = useState("")
  const [currentSelection, setCurrentSelection] = useState<{
    blockId: string
    start: number
    end: number
  } | null>(null)

  const { data: serverBlocks = [], isLoading, error } = useBlocks(pageId)
  const createBlockMutation = useCreateBlock()
  const updateBlockMutation = useUpdateBlock()
  const deleteBlockMutation = useDeleteBlock()

  const [currentTheme, setCurrentTheme] = useState<"light" | "dark">("light")

  // Theme detection logic
  useEffect(() => {
    const checkTheme = () => {
      const isDark =
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark") ||
        window.matchMedia("(prefers-color-scheme: dark)").matches
      setCurrentTheme(isDark ? "dark" : "light")
    }

    checkTheme()

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          checkTheme()
        }
      })
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class"],
    })

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => checkTheme()
    mediaQuery.addEventListener("change", handleChange)

    return () => {
      observer.disconnect()
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [])

  // Convert server blocks to BlockNote format - PRESERVE ORDER
  const processServerBlocks = useCallback((blocks: any[]) => {
    console.log("=== PROCESSING SERVER BLOCKS ===")
    console.log("Raw server blocks:", blocks)

    if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
      console.log("No valid blocks, returning default")
      return [
        {
          id: "default-paragraph",
          type: "paragraph",
          content: [],
          props: {
            textColor: "default",
            backgroundColor: "default",
            textAlignment: "left",
          },
          children: [],
        },
      ]
    }

    // CRITICAL FIX: Sort by position FIRST to maintain order
    const sortedBlocks = [...blocks]
      .filter((block) => block && (block.id || block.type))
      .sort((a, b) => {
        const posA = a.position || 0
        const posB = b.position || 0
        return posA - posB
      })

    const processedBlocks = sortedBlocks
      .map((block, index) => {
        console.log(`Processing block ${index}:`, block)

        try {
          // Handle table blocks
          if (block.type === "table" || block.type === "tableContent" || (block.rows && Array.isArray(block.rows))) {
            console.log("Processing table block:", block)

            if (block.type === "table" && block.content && block.content.rows) {
              return {
                id: block.id || `table-${index}`,
                type: "table",
                props: {
                  textColor: "default",
                  backgroundColor: "default",
                  ...block.props,
                },
                content: {
                  type: "tableContent",
                  rows: block.content.rows,
                  columnWidths: block.content.columnWidths || [],
                },
                children: block.children || [],
              }
            }

            const rows = block.rows || block.content?.rows
            if (!rows || !Array.isArray(rows) || rows.length === 0) {
              console.error("Invalid table: no valid rows", block)
              return createFallbackBlock(index, "Invalid table structure")
            }

            return {
              id: block.id || `table-${index}`,
              type: "table",
              props: {
                textColor: "default",
                backgroundColor: "default",
                ...block.props,
              },
              content: {
                type: "tableContent",
                rows: rows,
                columnWidths: block.columnWidths || block.content?.columnWidths || [],
              },
              children: [],
            }
          }
        } catch (error) {
          console.error(`Error processing table block ${index}:`, error, block)
          return createFallbackBlock(index)
        }

        try {
          // Handle regular blocks
          let content = []
          if (Array.isArray(block.content)) {
            content = block.content
          } else if (block.content && typeof block.content === "string") {
            content = [
              {
                type: "text",
                text: block.content,
                styles: {},
              },
            ]
          } else if (block.content && typeof block.content === "object") {
            content = [block.content]
          }

          const processedBlock = {
            id: block.id || `block-${index}`,
            type: block.type || "paragraph",
            content: content,
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
              ...(block.properties || block.props || {}),
            },
            children: block.children || [],
          }

          console.log(`Processed block ${index}:`, processedBlock)
          return processedBlock
        } catch (error) {
          console.error(`Error processing regular block ${index}:`, error, block)
          return createFallbackBlock(index)
        }
      })
      .filter(Boolean)

    // Helper function to create fallback blocks
    function createFallbackBlock(index: number, reason = "Error loading content") {
      return {
        id: `fallback-${index}`,
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: reason,
            styles: {},
          },
        ],
        children: [],
      }
    }

    console.log("Final processed blocks:", processedBlocks)
    console.log("=== END PROCESSING ===")

    return processedBlocks.length > 0
      ? processedBlocks
      : [
          {
            id: "default-paragraph",
            type: "paragraph",
            content: [],
            props: {
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            children: [],
          },
        ]
  }, [])

  // Safe table transformation function
  const transformTableToBlockNote = (tableData: any) => {
    try {
      if (!tableData || (!tableData.rows && !tableData.content?.rows)) {
        console.error("Invalid table data structure:", tableData)
        return null
      }

      const rows = tableData.rows || tableData.content?.rows || []
      const columnWidths = tableData.columnWidths || tableData.content?.columnWidths || []

      return {
        id: tableData.id || `table-${Date.now()}`,
        type: "table",
        props: {
          textColor: "default",
          backgroundColor: "default",
          ...tableData.props,
        },
        content: {
          type: "tableContent",
          rows: rows,
          columnWidths: columnWidths,
        },
        children: tableData.children || [],
      }
    } catch (error) {
      console.error("Error transforming table:", error)
      return null
    }
  }

  // Create BlockNote editor with static initial content
  const editor = useCreateBlockNote({
    initialContent: [
      {
        id: "loading-paragraph",
        type: "paragraph",
        content: [],
        props: {},
      },
    ],
  })

  console.log("====================================")
  console.log("inital editor", editor.document)
  console.log("====================================")

  // Store editor reference
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Load server content into editor AFTER it's created and server data is ready
  useEffect(() => {
    const loadServerContent = async () => {
      if (!editor || isLoading || !serverBlocks) {
        console.log("Not ready to load content:", {
          hasEditor: !!editor,
          isLoading,
          hasServerBlocks: !!serverBlocks,
        })
        return
      }

      console.log("=== LOADING SERVER CONTENT INTO EDITOR ===")
      console.log("Server blocks:", serverBlocks)

      try {
        const validServerBlocks = serverBlocks.filter((block) => {
          if (!block || typeof block !== "object") {
            console.warn("Invalid block found:", block)
            return false
          }
          return true
        })

        const processedBlocks = processServerBlocks(validServerBlocks)
        console.log("Processed blocks for editor:", processedBlocks)

        const validProcessedBlocks = processedBlocks.filter((block) => {
          if (!block || !block.id || !block.type) {
            console.warn("Invalid processed block found:", block)
            return false
          }
          return true
        })

        if (validProcessedBlocks.length === 0) {
          validProcessedBlocks.push({
            id: "default-paragraph",
            type: "paragraph",
            content: [],
            props: {},
            children: [],
          })
        }

        await editor.replaceBlocks(editor.document, validProcessedBlocks)

        console.log("Successfully loaded server content into editor")
        console.log("Current editor document:", editor.document)

        setIsEditorReady(true)
        hasInitializedRef.current = true
        setLastSaved(new Date())
      } catch (error) {
        console.error("Failed to load server content:", error)
        console.error("Error stack:", error.stack)

        try {
          await editor.replaceBlocks(editor.document, [
            {
              id: "error-fallback",
              type: "paragraph",
              content: [],
              props: {},
            },
          ])
          setIsEditorReady(true)
          hasInitializedRef.current = true
        } catch (fallbackError) {
          console.error("Fallback also failed:", fallbackError)
        }
      }
    }

    if (!isEditorReady) {
      loadServerContent()
    }
  }, [editor, serverBlocks, isLoading, isEditorReady, processServerBlocks])

  // IMPROVED: Helper function to calculate position while preserving order
  const calculatePosition = useCallback(
    (editorBlocks: any[], blockIndex: number, existingPositions: Map<string, number>): number => {
      // If it's the first block
      if (blockIndex === 0) {
        return 1000 // Start with a base value
      }

      // Find the previous block's position
      let prevPosition = 0
      for (let i = blockIndex - 1; i >= 0; i--) {
        const prevBlock = editorBlocks[i]
        if (existingPositions.has(prevBlock.id)) {
          prevPosition = existingPositions.get(prevBlock.id)!
          break
        }
      }

      // Find the next block's position
      let nextPosition = prevPosition + 2000 // Default gap
      for (let i = blockIndex + 1; i < editorBlocks.length; i++) {
        const nextBlock = editorBlocks[i]
        if (existingPositions.has(nextBlock.id)) {
          nextPosition = existingPositions.get(nextBlock.id)!
          break
        }
      }

      // Calculate position between previous and next
      return Math.floor((prevPosition + nextPosition) / 2)
    },
    [],
  )

  // Improved function to check if block exists on server
  const isBlockOnServer = useCallback(
    (id: string): boolean => {
      return serverBlocks.some((block) => block.id === id)
    },
    [serverBlocks],
  )

  // Helper function to check if ID looks like a real server ID
  const isServerGeneratedId = useCallback((id: string): boolean => {
    const isNotPlaceholder = id !== "loading-paragraph" && id !== "default-paragraph" && id !== "error-fallback"
    const isNotTempId = !id.startsWith("temp-") && !id.startsWith("new-")
    const isNotClientGenerated = !id.includes("client-") && !id.includes("local-")

    const looksLikeServerId =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || // UUID
      /^[0-9a-f]{24}$/i.test(id) || // MongoDB ObjectId
      /^\d+$/i.test(id) || // Numeric ID
      (id.length > 10 && !id.includes("-temp")) // Generic long ID

    return isNotPlaceholder && isNotTempId && isNotClientGenerated && looksLikeServerId
  }, [])

  // Most reliable check - combine server existence with ID format
  const isConfirmedServerBlock = useCallback(
    (id: string): boolean => {
      const existsOnServer = isBlockOnServer(id)
      const looksLikeServerId = isServerGeneratedId(id)

      console.log(`Checking block ${id}:`, {
        existsOnServer,
        looksLikeServerId,
        isConfirmed: existsOnServer && looksLikeServerId,
      })

      return existsOnServer && looksLikeServerId
    },
    [isBlockOnServer, isServerGeneratedId],
  )

  // FIXED: Save changes to server with proper position handling
  const saveChanges = useCallback(
    async (editorDocument: any[]) => {
      if (isSavingRef.current || !isEditorReady) {
        console.log("Skipping save - either saving in progress or editor not ready")
        return
      }

      console.log("=== SAVING CHANGES ===")
      console.log("Editor document:", editorDocument)
      console.log("Server blocks:", serverBlocks)

      isSavingRef.current = true
      setSaveStatus("saving")

      try {
        // Create a map of existing positions to preserve order
        const existingPositions = new Map<string, number>()
        serverBlocks.forEach((block) => {
          if (block.position !== undefined) {
            existingPositions.set(block.id, block.position)
          }
        })

        // STEP 1: Handle deletions - ONLY delete blocks that actually exist on server
        const editorAllIds = new Set(editorDocument.map((block) => block.id))

        const blocksToDelete = serverBlocks.filter((serverBlock) => {
          const isMissingFromEditor = !editorAllIds.has(serverBlock.id)
          const hasValidId = isServerGeneratedId(serverBlock.id)

          console.log(`Checking deletion for block ${serverBlock.id}:`, {
            isMissingFromEditor,
            hasValidId,
            shouldDelete: isMissingFromEditor && hasValidId,
          })

          return isMissingFromEditor && hasValidId
        })

        console.log(
          "Blocks to delete:",
          blocksToDelete.map((b) => b.id),
        )

        // Delete blocks
        if (blocksToDelete.length > 0) {
          for (const block of blocksToDelete) {
            try {
              console.log("Deleting block:", block.id)
              await deleteBlockMutation.mutateAsync({
                blockId: block.id,
                pageId,
              })
              console.log("Successfully deleted block:", block.id)
            } catch (error) {
              console.error("Failed to delete block:", block.id, error)
            }
          }
        }

        // STEP 2: Handle creates and updates in ORDER
        console.log("Processing blocks in editor order...")

        for (let i = 0; i < editorDocument.length; i++) {
          const block = editorDocument[i]

          // Calculate position based on editor order
          const position = calculatePosition(editorDocument, i, existingPositions)

          if (!isConfirmedServerBlock(block.id)) {
            // CREATE NEW BLOCK
            console.log(`Creating new block at position ${i}:`, block)
            try {
              const newBlock = await createBlockMutation.mutateAsync({
                pageId,
                type: mapBlockNoteTypeToAPI(block.type),
                content: block.content,
                properties: block.props || {},
                position,
              })
              console.log("Successfully created block:", newBlock)

              // Update our position map for subsequent calculations
              existingPositions.set(block.id, position)
            } catch (error) {
              console.error("Failed to create block:", block, error)
            }
          } else {
            // UPDATE EXISTING BLOCK
            const existingBlock = serverBlocks.find((b) => b.id === block.id)

            if (existingBlock) {
              const hasChanged = hasBlockChanged ? hasBlockChanged(existingBlock, block) : true

              // ALWAYS update position to maintain order
              const currentPosition = existingBlock.position || 0
              const needsPositionUpdate = Math.abs(currentPosition - position) > 100

              if (hasChanged || needsPositionUpdate) {
                console.log(`Updating existing block at position ${i}:`, block)

                const updateData: any = {
                  content: block.content,
                  properties: block.props,
                  position, // ALWAYS set position to maintain order
                }

                if (existingBlock.type !== mapBlockNoteTypeToAPI(block.type)) {
                  updateData.type = mapBlockNoteTypeToAPI(block.type)
                }

                try {
                  await updateBlockMutation.mutateAsync({
                    id: block.id,
                    data: updateData,
                  })
                  console.log("Successfully updated block:", block.id)

                  // Update our position map
                  existingPositions.set(block.id, position)
                } catch (error) {
                  console.error("Failed to update block:", block.id, error)
                }
              } else {
                console.log("Block unchanged and position correct, skipping update:", block.id)
              }
            }
          }
        }

        console.log("Save operation completed successfully")
        setSaveStatus("saved")
        setLastSaved(new Date())

        // Clear saved status after 2 seconds
        setTimeout(() => {
          setSaveStatus("idle")
        }, 2000)
      } catch (error) {
        console.error("Failed to save changes:", error)
        setSaveStatus("error")

        // Clear error status after 5 seconds
        setTimeout(() => {
          setSaveStatus("idle")
        }, 5000)
      } finally {
        isSavingRef.current = false
      }
    },
    [
      serverBlocks,
      pageId,
      createBlockMutation,
      updateBlockMutation,
      deleteBlockMutation,
      isConfirmedServerBlock,
      isServerGeneratedId,
      isEditorReady,
      calculatePosition,
    ],
  )

  // Debounced save function
  const debouncedSave = useMemo(() => debounce(saveChanges, 500), [saveChanges])

  // Handle content changes
  const handleContentChange = useCallback(
    (editor: any) => {
      if (!isEditorReady || !hasInitializedRef.current) {
        console.log("Editor not ready or not initialized, skipping change handler")
        return
      }

      console.log("=== CONTENT CHANGED ===")
      console.log("New document:", editor.document)

      const blocks = editor.document

      dispatch(setBlocks(blocks))
      setPendingChanges(blocks)
    },
    [isEditorReady, dispatch],
  )

  // Handle key press events
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " " || event.key === "Backspace") {
        console.log("=== TRIGGER SAVE ON KEY PRESS ===")
        console.log("Key pressed:", event.key)

        if (
          pendingChanges &&
          !createBlockMutation.isPending &&
          !updateBlockMutation.isPending &&
          !deleteBlockMutation.isPending
        ) {
          console.log("Saving pending changes on key press")
          debouncedSave(pendingChanges)
          setPendingChanges(null)
        }
      }
    },
    [
      pendingChanges,
      debouncedSave,
      createBlockMutation.isPending,
      updateBlockMutation.isPending,
      deleteBlockMutation.isPending,
    ],
  )

  // Manual save function
  const handleManualSave = useCallback(() => {
    if (
      pendingChanges &&
      !isSavingRef.current &&
      !createBlockMutation.isPending &&
      !updateBlockMutation.isPending &&
      !deleteBlockMutation.isPending
    ) {
      console.log("Manual save triggered")
      saveChanges(pendingChanges)
      setPendingChanges(null)
    }
  }, [
    pendingChanges,
    saveChanges,
    createBlockMutation.isPending,
    updateBlockMutation.isPending,
    deleteBlockMutation.isPending,
  ])

  // Text selection handler
  const handleTextSelection = useCallback(() => {
    if (!editor || !isEditorReady) return

    try {
      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setSelectedTextForRephrase("")
        setCurrentSelection(null)
        return
      }

      const selectedText = selection.toString().trim()
      if (selectedText.length < 5) {
        setSelectedTextForRephrase("")
        setCurrentSelection(null)
        return
      }

      const range = selection.getRangeAt(0)
      const container = range.commonAncestorContainer

      let blockElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as Element)
      while (blockElement && !blockElement.hasAttribute("data-node-type")) {
        blockElement = blockElement.parentElement
      }

      if (blockElement) {
        const blockId = blockElement.getAttribute("data-id")
        if (blockId) {
          setSelectedTextForRephrase(selectedText)
          setCurrentSelection({
            blockId,
            start: range.startOffset,
            end: range.endOffset,
          })
        }
      }
    } catch (error) {
      console.error("Error handling text selection:", error)
    }
  }, [editor, isEditorReady])

  // AI content generation handler
  const handleContentGenerated = useCallback(
    (generatedContent: string, type: string) => {
      if (!editor) return

      try {
        const paragraphs = generatedContent
          .split("\n")
          .filter((p) => p.trim().length > 0)
          .map((p) => p.trim())

        const newContent = paragraphs.map((paragraph, index) => ({
          id: `generated-${Date.now()}-${index}`,
          type: "paragraph",
          content: [
            {
              type: "text",
              text: paragraph,
              styles: {},
            },
          ],
          props: {},
        }))

        if (type === "replace" && currentSelection) {
          const blockToUpdate = editor.document.find((block: any) => block.id === currentSelection.blockId)
          if (blockToUpdate && newContent[0]) {
            editor.updateBlock(blockToUpdate.id, {
              content: newContent[0].content,
            })

            if (newContent.length > 1) {
              for (let i = 1; i < newContent.length; i++) {
                editor.insertBlocks([newContent[i]], blockToUpdate.id, "after")
              }
            }
          }
        } else {
          const lastBlock = editor.document[editor.document.length - 1]
          if (lastBlock) {
            editor.insertBlocks(newContent, lastBlock.id, "after")
          } else {
            editor.replaceBlocks(editor.document, newContent)
          }
        }
      } catch (error) {
        console.error("Error applying generated content:", error)
      }
    },
    [editor, currentSelection],
  )

  // Rephrase handler
  const handleRephraseComplete = useCallback(
    (rephrasedText: string, style: string) => {
      if (!editor || !currentSelection) return

      try {
        const blockToUpdate = editor.document.find((block: any) => block.id === currentSelection.blockId)
        if (!blockToUpdate) return

        let currentText = ""
        if (blockToUpdate.content && Array.isArray(blockToUpdate.content)) {
          currentText = blockToUpdate.content
            .filter((item: any) => item.type === "text")
            .map((item: any) => item.text)
            .join("")
        }

        const beforeSelection = currentText.substring(0, currentSelection.start)
        const afterSelection = currentText.substring(currentSelection.end)
        const newText = beforeSelection + rephrasedText + afterSelection

        const newContent = [
          {
            type: "text" as const,
            text: newText,
            styles: {},
          },
        ]

        editor.updateBlock(blockToUpdate.id, {
          content: newContent,
        })

        setCurrentSelection(null)
        setSelectedTextForRephrase("")
      } catch (error) {
        console.error("Error applying rephrased text:", error)
      }
    },
    [editor, currentSelection],
  )

  // Add and remove keyboard event listeners
  useEffect(() => {
    if (isEditorReady && editorRef.current) {
      console.log("Adding keydown event listener")

      const editorElement =
        editorRef.current.domElement ||
        editorRef.current._tiptapEditor?.view?.dom ||
        editorRef.current.prosemirrorView?.dom ||
        document

      console.log("Editor element found:", editorElement)

      const handleKeyUp = (event: KeyboardEvent) => {
        console.log("Key event detected:", event.key, event.code)
        handleKeyDown(event)
      }

      const handleMouseUp = () => {
        setTimeout(() => handleTextSelection(), 100)
      }

      const handleBlur = () => {
        setTimeout(() => {
          if (
            pendingChanges &&
            !isSavingRef.current &&
            !createBlockMutation.isPending &&
            !updateBlockMutation.isPending &&
            !deleteBlockMutation.isPending
          ) {
            console.log("Auto-save on blur")
            saveChanges(pendingChanges)
            setPendingChanges(null)
          }
        }, 500)
      }

      editorElement.addEventListener("keyup", handleKeyUp)
      document.addEventListener("mouseup", handleMouseUp)
      document.addEventListener("keyup", handleMouseUp)

      if (editorElement !== document) {
        editorElement.addEventListener("blur", handleBlur)
      }

      return () => {
        console.log("Removing keyup event listener")
        editorElement.removeEventListener("keyup", handleKeyUp)
        document.removeEventListener("mouseup", handleMouseUp)
        document.removeEventListener("keyup", handleMouseUp)

        if (editorElement !== document) {
          editorElement.removeEventListener("blur", handleBlur)
        }

        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
      }
    }
  }, [
    isEditorReady,
    handleKeyDown,
    handleTextSelection,
    pendingChanges,
    saveChanges,
    createBlockMutation.isPending,
    updateBlockMutation.isPending,
    deleteBlockMutation.isPending,
  ])

  // Button visibility logic
  const showRephraseButton = selectedTextForRephrase.length > 0
  const showAIButton = true

  // Show loading state
  if (isLoading || !isEditorReady) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4 animate-fade-in">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-muted rounded-full animate-spin border-t-primary"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent rounded-full animate-pulse border-t-primary/20"></div>
          </div>
          <div className="text-center space-y-2">
            <div className="text-lg font-serif font-medium text-foreground">
              {isLoading ? "Loading your content..." : "Preparing editor..."}
            </div>
            <div className="text-sm text-muted-foreground font-sans">This will just take a moment</div>
          </div>
        </div>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <div className="text-center max-w-md mx-auto animate-fade-in">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <h3 className="text-xl font-serif font-semibold text-foreground mb-2">Unable to load editor</h3>
          <p className="text-muted-foreground font-sans mb-4">
            {error.message || "An unexpected error occurred while loading your content."}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-sans font-medium hover:bg-primary/90 transition-colors duration-200"
          >
            Try again
          </button>
          <div className="mt-4 p-4 bg-gray-100 rounded text-left text-xs">
            <strong>Debug Info:</strong>
            <pre>{JSON.stringify({ pageId, error }, null, 2)}</pre>
          </div>
        </div>
      </div>
    )
  }

  // Status indicator component
  const StatusIndicator = () => {
    const isSaving =
      createBlockMutation.isPending ||
      updateBlockMutation.isPending ||
      deleteBlockMutation.isPending ||
      saveStatus === "saving"

    if (isSaving) {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-primary/10 text-primary rounded-full text-sm font-sans animate-slide-in">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Saving changes...</span>
        </div>
      )
    }

    if (saveStatus === "saved") {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-full text-sm font-sans animate-slide-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>All changes saved</span>
        </div>
      )
    }

    if (saveStatus === "error") {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-destructive/10 text-destructive rounded-full text-sm font-sans animate-slide-in">
          <AlertCircle className="w-4 h-4" />
          <span>Save failed</span>
        </div>
      )
    }

    if (pendingChanges && pendingChanges.length > 0) {
      return (
        <div className="flex items-center space-x-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full text-sm font-sans animate-slide-in">
          <Clock className="w-4 h-4" />
          <span>Unsaved changes</span>
        </div>
      )
    }

    return null
  }

  return (
    <div className="w-full h-full relative">
      {/* AI Content Generation Modal */}
      <AIContentModal
        isOpen={isAIContentModalOpen}
        onClose={() => {
          setIsAIContentModalOpen(false)
          setSelectedTextForRephrase("")
          setCurrentSelection(null)
        }}
        selectedText={selectedTextForRephrase}
        onContentGenerated={handleContentGenerated}
        insertMode={selectedTextForRephrase ? "replace" : "new-block"}
      />

      {/* Rephrase Modal */}
      <RephraseModal
        isOpen={isRephraseModalOpen}
        onClose={() => {
          setIsRephraseModalOpen(false)
          setSelectedTextForRephrase("")
          setCurrentSelection(null)
        }}
        selectedText={selectedTextForRephrase}
        onRephrase={handleRephraseComplete}
      />

      <div className="fixed top-4 right-4 z-50">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg backdrop-blur-md transition-all duration-200",
            "text-xs font-medium border",
            saveStatus === "saving" && "bg-background/95 text-muted-foreground border-border",
            saveStatus === "saved" && "bg-background/95 text-foreground border-border",
            saveStatus === "error" && "bg-background/95 text-destructive border-destructive/20",
            saveStatus === "idle" && "bg-background/95 text-muted-foreground border-border",
          )}
        >
          {saveStatus === "saving" && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Saving</span>
            </>
          )}
          {saveStatus === "saved" && (
            <>
              <CheckCircle2 className="h-3 w-3" />
              <span>Saved</span>
            </>
          )}
          {saveStatus === "error" && (
            <>
              <AlertCircle className="h-3 w-3" />
              <span>Error</span>
            </>
          )}
          {saveStatus === "idle" && lastSaved && (
            <>
              <Clock className="h-3 w-3" />
              <span>
                {lastSaved.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="fixed bottom-6 right-6 z-50">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => setIsAIContentModalOpen(true)}
            className={cn(
              "w-12 h-12 bg-foreground text-background rounded-full",
              "hover:bg-foreground/90 transition-all duration-200",
              "flex items-center justify-center shadow-lg",
              "border border-border/20",
            )}
          >
            <Sparkles className="h-5 w-5" />
          </button>

          {selectedTextForRephrase && (
            <button
              onClick={() => setIsRephraseModalOpen(true)}
              className={cn(
                "w-10 h-10 bg-muted text-muted-foreground rounded-full",
                "hover:bg-muted/80 transition-all duration-200",
                "flex items-center justify-center shadow-md",
                "border border-border/20",
              )}
            >
              <Wand2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "relative w-full bg-background",
          "border border-border rounded-lg",
          "min-h-[calc(100vh-8rem)] h-auto",
          "focus-within:ring-1 focus-within:ring-border",
        )}
      >
        <div className="h-auto overflow-auto p-6 lg:p-8">
          <div
            style={
              {
                "--bn-colors-editor-background": "hsl(var(--background))",
                "--bn-colors-editor-text": "hsl(var(--foreground))",
                "--bn-colors-menu-background": "hsl(var(--background))",
                "--bn-colors-menu-text": "hsl(var(--foreground))",
                "--bn-colors-tooltip-background": "hsl(var(--background))",
                "--bn-colors-tooltip-text": "hsl(var(--foreground))",
                "--bn-colors-hovered-background": "hsl(var(--muted))",
                "--bn-colors-hovered-text": "hsl(var(--foreground))",
                "--bn-colors-selected-background": "hsl(var(--muted))",
                "--bn-colors-selected-text": "hsl(var(--foreground))",
                "--bn-colors-disabled-background": "hsl(var(--muted))",
                "--bn-colors-disabled-text": "hsl(var(--muted-foreground))",
                "--bn-colors-shadow": "hsl(var(--border))",
                "--bn-colors-border": "hsl(var(--border))",
                "--bn-colors-side-menu": "hsl(var(--muted))",
                "--bn-colors-highlights-gray-background": "hsl(var(--muted))",
                "--bn-colors-highlights-gray-text": "hsl(var(--muted-foreground))",
                "--bn-colors-highlights-brown-background": "hsl(var(--muted))",
                "--bn-colors-highlights-brown-text": "hsl(var(--foreground))",
                "--bn-colors-highlights-red-background": "hsl(var(--muted))",
                "--bn-colors-highlights-red-text": "hsl(var(--foreground))",
                "--bn-colors-highlights-orange-background": "hsl(var(--muted))",
                "--bn-colors-highlights-orange-text": "hsl(var(--foreground))",
                "--bn-colors-highlights-yellow-background": "hsl(var(--muted))",
                "--bn-colors-highlights-yellow-text": "hsl(var(--foreground))",
                "--bn-colors-highlights-green-background": "hsl(var(--muted))",
                "--bn-colors-highlights-green-text": "hsl(var(--foreground))",
                "--bn-colors-highlights-blue-background": "hsl(var(--muted))",
                "--bn-colors-highlights-blue-text": "hsl(var(--foreground))",
                "--bn-colors-highlights-purple-background": "hsl(var(--muted))",
                "--bn-colors-highlights-purple-text": "hsl(var(--foreground))",
                "--bn-colors-highlights-pink-background": "hsl(var(--muted))",
                "--bn-colors-highlights-pink-text": "hsl(var(--foreground))",
              } as React.CSSProperties
            }
          >
            <BlockNoteView
              editor={editor}
              onChange={handleContentChange}
              theme={currentTheme}
              className={cn(
                "h-auto w-full max-w-4xl mx-auto",
                "prose prose-lg max-w-none",
                "text-base leading-relaxed",
                "prose-headings:font-semibold prose-headings:text-foreground",
                "prose-h1:text-3xl prose-h1:mb-6 prose-h1:mt-8",
                "prose-h2:text-2xl prose-h2:mb-4 prose-h2:mt-6",
                "prose-h3:text-xl prose-h3:mb-3 prose-h3:mt-4",
                "prose-p:text-foreground prose-p:leading-relaxed prose-p:mb-4",
                "prose-strong:text-foreground prose-strong:font-semibold",
                "prose-em:text-foreground",
                "prose-code:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
                "prose-pre:bg-muted prose-pre:border prose-pre:border-border",
                "prose-blockquote:border-l-4 prose-blockquote:border-border prose-blockquote:pl-4 prose-blockquote:text-muted-foreground",
                "prose-ul:text-foreground prose-ol:text-foreground",
                "prose-li:text-foreground prose-li:mb-1",
                "prose-a:text-foreground prose-a:underline prose-a:decoration-border hover:prose-a:decoration-foreground",
                "[&_.bn-editor]:min-h-[200px]",
                "[&_.bn-editor]:focus:outline-none",
                "[&_.ProseMirror]:focus:outline-none",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default BlockNoteEditor
