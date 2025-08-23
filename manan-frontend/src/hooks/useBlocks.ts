"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import useApi from "../lib/axios"
import type { Block, CreateBlockInput, UpdateBlockInput, BlockWithChildren } from "../types"
import React from "react"

// ============================================================================
// QUERY HOOKS
// ============================================================================

// Get all blocks for a specific page
export const useBlocks = (pageId?: string) => {
  const api = useApi()

  return useQuery<Block[]>({
    queryKey: ["blocks", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const res = await api.get(`/blocks/${pageId}/blocks`)
      return res.data || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - increased for better performance
    gcTime: 10 * 60 * 1000, // 10 minutes garbage collection
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
    refetchOnMount: false, // Only refetch if data is stale
    retry: (failureCount, error: any) => {
      // Smart retry logic - don't retry on 4xx errors
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false
      }
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Get a specific block by ID
export const useBlockById = (blockId?: string) => {
  const api = useApi()

  return useQuery<Block>({
    queryKey: ["blocks", "detail", blockId],
    enabled: !!blockId,
    queryFn: async () => {
      const res = await api.get(`/blocks/${blockId}`)
      return res.data
    },
    staleTime: 10 * 60 * 1000, // 10 minutes for individual blocks
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      if (error?.response?.status >= 400 && error?.response?.status < 500) {
        return false
      }
      return failureCount < 2
    },
  })
}

// Get blocks with hierarchy (nested blocks)
export const useBlocksWithHierarchy = (pageId?: string) => {
  const api = useApi()

  return useQuery<BlockWithChildren[]>({
    queryKey: ["blocks", "hierarchy", pageId],
    enabled: !!pageId,
    queryFn: async () => {
      const res = await api.get(`/blocks/${pageId}/blocks`)
      const blocks: Block[] = res.data || []

      const blockMap = new Map<string, Block>()
      const childrenMap = new Map<string, Block[]>()

      // Build maps for O(1) lookups
      blocks.forEach((block) => {
        blockMap.set(block.id, block)
        const parentId = block.parentId || "root"
        if (!childrenMap.has(parentId)) {
          childrenMap.set(parentId, [])
        }
        childrenMap.get(parentId)!.push(block)
      })

      // Sort children by position once
      childrenMap.forEach((children) => {
        children.sort((a, b) => a.position - b.position)
      })

      // Build hierarchy efficiently
      const buildHierarchy = (parentId: string | null): BlockWithChildren[] => {
        const key = parentId || "root"
        const children = childrenMap.get(key) || []

        return children.map((block) => ({
          ...block,
          children: buildHierarchy(block.id),
        }))
      }

      return buildHierarchy(null)
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })
}

// ============================================================================
// MUTATION HOOKS
// ============================================================================

// Create a new block
export const useCreateBlock = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation<Block, Error, CreateBlockInput>({
    mutationFn: async (blockData) => {
      const res = await api.post("/blocks", blockData)
      return res.data
    },
    onMutate: async (blockData) => {
      await queryClient.cancelQueries({ queryKey: ["blocks", blockData.pageId] })

      const previousBlocks = queryClient.getQueryData<Block[]>(["blocks", blockData.pageId])

      if (previousBlocks) {
        // Check if block already exists to prevent duplicates
        const exists = previousBlocks.some((block) => block.id === blockData.id)
        if (!exists) {
          const optimisticBlock = { ...blockData }
          queryClient.setQueryData<Block[]>(["blocks", blockData.pageId], [...previousBlocks, optimisticBlock])
        }
      }

      return { previousBlocks }
    },
    onSuccess: (newBlock) => {
      // Update blocks cache for the page
      queryClient.setQueryData<Block[]>(["blocks", newBlock.pageId], (oldBlocks) => {
        if (!oldBlocks) return [newBlock]
        // Check if block already exists to prevent duplicates
        const exists = oldBlocks.some((block) => block.id === newBlock.id)
        return exists ? oldBlocks : [...oldBlocks, newBlock]
      })

      // Batch invalidations to reduce re-renders
      queryClient.invalidateQueries({
        queryKey: ["blocks", "hierarchy", newBlock.pageId],
        exact: false,
      })
    },
    onError: (error, blockData, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData<Block[]>(["blocks", blockData.pageId], context.previousBlocks)
      }
      console.error("Failed to create block:", error)
    },
    retry: 1,
    retryDelay: 1000,
  })
}

// Update an existing block
export const useUpdateBlock = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation<Block, Error, { id: string; data: UpdateBlockInput }>({
    mutationFn: async ({ id, data }) => {
      const res = await api.patch(`/blocks/${id}`, data)
      return res.data
    },
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: ["blocks", "detail", id] })

      const previousBlock = queryClient.getQueryData<Block>(["blocks", "detail", id])

      if (previousBlock) {
        const optimisticBlock = { ...previousBlock, ...data }
        queryClient.setQueryData(["blocks", "detail", id], optimisticBlock)

        // Update in blocks list optimistically
        queryClient.setQueryData<Block[]>(["blocks", previousBlock.pageId], (oldBlocks) => {
          return oldBlocks?.map((block) => (block.id === id ? optimisticBlock : block))
        })
      }

      return { previousBlock }
    },
    onSuccess: (updatedBlock) => {
      // Update the specific block in cache
      queryClient.setQueryData<Block>(["blocks", "detail", updatedBlock.id], updatedBlock)

      // Update in blocks list
      queryClient.setQueryData<Block[]>(["blocks", updatedBlock.pageId], (oldBlocks) => {
        return oldBlocks?.map((block) => (block.id === updatedBlock.id ? updatedBlock : block))
      })

      // Invalidate hierarchy query
      queryClient.invalidateQueries({
        queryKey: ["blocks", "hierarchy", updatedBlock.pageId],
      })
    },
    onError: (error, variables, context) => {
      if (context?.previousBlock) {
        queryClient.setQueryData(["blocks", "detail", variables.id], context.previousBlock)

        queryClient.setQueryData<Block[]>(["blocks", context.previousBlock.pageId], (oldBlocks) => {
          return oldBlocks?.map((block) => (block.id === variables.id ? context.previousBlock! : block))
        })
      }
      console.error("Failed to update block:", error)
    },
    retry: 1,
    retryDelay: 1000,
  })
}

// Delete a block
export const useDeleteBlock = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation<void, Error, { id: string; pageId: string }>({
    mutationFn: async ({ id }) => {
      await api.delete(`/blocks/${id}`)
    },
    onMutate: async ({ id, pageId }) => {
      await queryClient.cancelQueries({ queryKey: ["blocks", pageId] })

      const previousBlocks = queryClient.getQueryData<Block[]>(["blocks", pageId])
      const blockToDelete = previousBlocks?.find((block) => block.id === id)

      if (previousBlocks) {
        queryClient.setQueryData<Block[]>(
          ["blocks", pageId],
          previousBlocks.filter((block) => block.id !== id),
        )
      }

      return { previousBlocks, blockToDelete }
    },
    onSuccess: (_, { id, pageId }) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: ["blocks", "detail", id] })

      // Invalidate hierarchy query
      queryClient.invalidateQueries({
        queryKey: ["blocks", "hierarchy", pageId],
      })
    },
    onError: (error, variables, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData(["blocks", variables.pageId], context.previousBlocks)
      }
      console.error("Failed to delete block:", error)
    },
    retry: 1,
    retryDelay: 1000,
  })
}

// Reorder blocks (update positions)
export const useReorderBlocks = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation<void, Error, { pageId: string; blockUpdates: Array<{ id: string; position: number }> }>({
    mutationFn: async ({ blockUpdates }) => {
      const batchSize = 10
      const batches = []

      for (let i = 0; i < blockUpdates.length; i += batchSize) {
        const batch = blockUpdates.slice(i, i + batchSize)
        batches.push(batch)
      }

      // Process batches sequentially to avoid overwhelming the server
      for (const batch of batches) {
        const promises = batch.map(({ id, position }) => api.patch(`/blocks/${id}`, { position }))
        await Promise.all(promises)
      }
    },
    onMutate: async ({ pageId, blockUpdates }) => {
      await queryClient.cancelQueries({ queryKey: ["blocks", pageId] })

      const previousBlocks = queryClient.getQueryData<Block[]>(["blocks", pageId])

      if (previousBlocks) {
        const updatedBlocks = [...previousBlocks]
        const updateMap = new Map(blockUpdates.map((u) => [u.id, u.position]))

        updatedBlocks.forEach((block) => {
          if (updateMap.has(block.id)) {
            block.position = updateMap.get(block.id)!
          }
        })

        updatedBlocks.sort((a, b) => a.position - b.position)
        queryClient.setQueryData(["blocks", pageId], updatedBlocks)
      }

      return { previousBlocks }
    },
    onSuccess: (_, { pageId }) => {
      // Invalidate queries to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["blocks", pageId] })
      queryClient.invalidateQueries({ queryKey: ["blocks", "hierarchy", pageId] })
    },
    onError: (error, variables, context) => {
      if (context?.previousBlocks) {
        queryClient.setQueryData(["blocks", variables.pageId], context.previousBlocks)
      }
      console.error("Failed to reorder blocks:", error)
    },
    retry: 1,
    retryDelay: 2000,
  })
}

// Move block to different parent (for nesting)
export const useMoveBlock = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation<Block, Error, { id: string; newParentId: string | null; position: number }>({
    mutationFn: async ({ id, newParentId, position }) => {
      const res = await api.patch(`/blocks/${id}`, {
        parentId: newParentId,
        position,
      })
      return res.data
    },
    onSuccess: (updatedBlock) => {
      queryClient.setQueryData<Block>(["blocks", "detail", updatedBlock.id], updatedBlock)

      queryClient.setQueryData<Block[]>(["blocks", updatedBlock.pageId], (oldBlocks) => {
        return oldBlocks?.map((block) => (block.id === updatedBlock.id ? updatedBlock : block))
      })

      queryClient.invalidateQueries({ queryKey: ["blocks", "hierarchy", updatedBlock.pageId] })
    },
  })
}

// Duplicate a block
export const useDuplicateBlock = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation<Block, Error, { blockId: string; pageId: string }>({
    mutationFn: async ({ blockId }) => {
      // Get the original block first
      const originalBlock = await api.get(`/blocks/${blockId}`)
      const block = originalBlock.data

      // Create a new block with the same data
      const duplicateData: CreateBlockInput = {
        pageId: block.pageId,
        type: block.type,
        content: block.content,
        properties: block.properties,
        metadata: block.metadata,
        position: block.position + 0.1, // Place it right after the original
        parentId: block.parentId,
      }

      const res = await api.post("/blocks", duplicateData)
      return res.data
    },
    onSuccess: (newBlock, { pageId }) => {
      queryClient.setQueryData<Block[]>(["blocks", pageId], (oldBlocks) => {
        return oldBlocks ? [...oldBlocks, newBlock] : [newBlock]
      })

      queryClient.invalidateQueries({ queryKey: ["blocks", "hierarchy", pageId] })
    },
  })
}

// Bulk operations
export const useBulkUpdateBlocks = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return useMutation<void, Error, { updates: Array<{ id: string; data: UpdateBlockInput }> }>({
    mutationFn: async ({ updates }) => {
      const batchSize = 5 // Smaller batch size for updates
      const batches = []

      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize)
        batches.push(batch)
      }

      const results = []
      for (const batch of batches) {
        try {
          const promises = batch.map(({ id, data }) => api.patch(`/blocks/${id}`, data))
          const batchResults = await Promise.allSettled(promises)
          results.push(...batchResults)
        } catch (error) {
          console.error("Batch update failed:", error)
          throw error
        }
      }

      // Check for any failures
      const failures = results.filter((result) => result.status === "rejected")
      if (failures.length > 0) {
        console.warn(`${failures.length} updates failed out of ${updates.length}`)
      }
    },
    onSuccess: (_, { updates }) => {
      const pageIds = [
        ...new Set(
          updates
            .map((update) => {
              // Try to get pageId from existing cache
              const cachedBlocks = queryClient.getQueryData<Block[]>(["blocks"])
              const block = cachedBlocks?.find((b) => b.id === update.id)
              return block?.pageId
            })
            .filter(Boolean),
        ),
      ]

      // Invalidate specific page queries instead of all blocks
      pageIds.forEach((pageId) => {
        if (pageId) {
          queryClient.invalidateQueries({ queryKey: ["blocks", pageId] })
          queryClient.invalidateQueries({ queryKey: ["blocks", "hierarchy", pageId] })
        }
      })

      // Fallback: invalidate all if we couldn't determine specific pages
      if (pageIds.length === 0) {
        queryClient.invalidateQueries({ queryKey: ["blocks"] })
      }
    },
    retry: 1,
    retryDelay: 2000,
  })
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

// Get blocks by type
export const useBlocksByType = (pageId?: string, type?: string) => {
  const { data: blocks = [], isLoading } = useBlocks(pageId)

  const filteredBlocks = React.useMemo(() => {
    return type ? blocks.filter((block) => block.type === type) : blocks
  }, [blocks, type])

  return {
    data: filteredBlocks,
    isLoading,
  }
}

// Get block count for a page
export const useBlockCount = (pageId?: string) => {
  const { data: blocks = [], isLoading } = useBlocks(pageId)

  const counts = React.useMemo(() => {
    const byType = blocks.reduce(
      (acc, block) => {
        acc[block.type] = (acc[block.type] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      total: blocks.length,
      byType,
    }
  }, [blocks])

  return {
    ...counts,
    isLoading,
  }
}

// Prefetch blocks for a page (useful for navigation)
export const usePrefetchBlocks = () => {
  const api = useApi()
  const queryClient = useQueryClient()

  return React.useCallback(
    (pageId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["blocks", pageId],
        queryFn: async () => {
          const res = await api.get(`/blocks/${pageId}/blocks`)
          return res.data || []
        },
        staleTime: 5 * 60 * 1000,
      })
    },
    [api, queryClient],
  )
}

// Optimized hook for checking if blocks exist without loading full data
export const useHasBlocks = (pageId?: string) => {
  const { data: blocks, isLoading } = useBlocks(pageId)

  return React.useMemo(
    () => ({
      hasBlocks: (blocks?.length ?? 0) > 0,
      count: blocks?.length ?? 0,
      isLoading,
    }),
    [blocks, isLoading],
  )
}
