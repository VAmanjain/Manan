import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useApi from "../lib/axios";
import type {
    Block,
    CreateBlockInput,
    UpdateBlockInput,
    BlockWithChildren
} from "../types";

// ============================================================================
// QUERY HOOKS
// ============================================================================

// Get all blocks for a specific page
export const useBlocks = (pageId?: string) => {
    const api = useApi();

    return useQuery<Block[]>({
        queryKey: ["blocks", pageId],
        enabled: !!pageId,
        queryFn: async () => {
            const res = await api.get(`/blocks/${pageId}/blocks`); // Fixed API path
            return res.data || [];
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

// Get a specific block by ID
export const useBlockById = (blockId?: string) => {
    const api = useApi();

    return useQuery<Block>({
        queryKey: ["blocks", "detail", blockId],
        enabled: !!blockId,
        queryFn: async () => {
            const res = await api.get(`/blocks/${blockId}`);
            return res.data;
        },
        staleTime: 2 * 60 * 1000,
    });
};

// Get blocks with hierarchy (nested blocks)
export const useBlocksWithHierarchy = (pageId?: string) => {
    const api = useApi();

    return useQuery<BlockWithChildren[]>({
        queryKey: ["blocks", "hierarchy", pageId],
        enabled: !!pageId,
        queryFn: async () => {
            const res = await api.get(`/blocks/${pageId}/blocks`);
            const blocks: Block[] = res.data || [];

            // Build hierarchy
            const buildHierarchy = (parentId: string | null): BlockWithChildren[] => {
                return blocks
                    .filter((block) => block.parentId === parentId)
                    .map((block) => ({
                        ...block,
                        children: buildHierarchy(block.id)
                    }))
                    .sort((a, b) => a.position - b.position);
            };

            return buildHierarchy(null);
        },
        staleTime: 2 * 60 * 1000,
    });
};

// ============================================================================
// MUTATION HOOKS
// ============================================================================

// Create a new block
export const useCreateBlock = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Block, Error, CreateBlockInput>({
        mutationFn: async (blockData) => {
            const res = await api.post("/blocks", blockData);
            return res.data;
        },
        onSuccess: (newBlock) => {
            // Update blocks cache for the page
            queryClient.setQueryData<Block[]>(
                ["blocks", newBlock.pageId],
                (oldBlocks) => {
                    return oldBlocks ? [...oldBlocks, newBlock] : [newBlock];
                }
            );

            // Invalidate hierarchy query
            queryClient.invalidateQueries({
                queryKey: ["blocks", "hierarchy", newBlock.pageId]
            });
        },
        onError: (error) => {
            console.error("Failed to create block:", error);
        },
    });
};

// Update an existing block
export const useUpdateBlock = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Block, Error, { id: string; data: UpdateBlockInput }>({
        mutationFn: async ({ id, data }) => {
            const res = await api.patch(`/blocks/${id}`, data);
            return res.data;
        },
        onSuccess: (updatedBlock) => {
            // Update the specific block in cache
            queryClient.setQueryData<Block>(
                ["blocks", "detail", updatedBlock.id],
                updatedBlock
            );

            // Update in blocks list
            queryClient.setQueryData<Block[]>(
                ["blocks", updatedBlock.pageId],
                (oldBlocks) => {
                    return oldBlocks?.map((block) =>
                        block.id === updatedBlock.id ? updatedBlock : block
                    );
                }
            );

            // Invalidate hierarchy query
            queryClient.invalidateQueries({
                queryKey: ["blocks", "hierarchy", updatedBlock.pageId]
            });
        },
        onError: (error) => {
            console.error("Failed to update block:", error);
        },
    });
};

// Delete a block
export const useDeleteBlock = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<void, Error, { id: string; pageId: string }>({
        mutationFn: async ({ id }) => {
            await api.delete(`/blocks/${id}`);
        },
        onSuccess: (_, { id, pageId }) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: ["blocks", "detail", id] });

            // Remove from blocks list
            queryClient.setQueryData<Block[]>(
                ["blocks", pageId],
                (oldBlocks) => {
                    return oldBlocks?.filter((block) => block.id !== id);
                }
            );

            // Invalidate hierarchy query
            queryClient.invalidateQueries({
                queryKey: ["blocks", "hierarchy", pageId]
            });
        },
        onError: (error) => {
            console.error("Failed to delete block:", error);
        },
    });
};

// Reorder blocks (update positions)
export const useReorderBlocks = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<void, Error, { pageId: string; blockUpdates: Array<{ id: string; position: number }> }>({
        mutationFn: async ({ blockUpdates }) => {
            // Update each block's position
            const promises = blockUpdates.map(({ id, position }) =>
                api.patch(`/blocks/${id}`, { position })
            );
            await Promise.all(promises);
        },
        onSuccess: (_, { pageId }) => {
            // Invalidate all block queries for this page
            queryClient.invalidateQueries({ queryKey: ["blocks", pageId] });
            queryClient.invalidateQueries({ queryKey: ["blocks", "hierarchy", pageId] });
        },
        onError: (error) => {
            console.error("Failed to reorder blocks:", error);
        },
    });
};

// Move block to different parent (for nesting)
export const useMoveBlock = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Block, Error, { id: string; newParentId: string | null; position: number }>({
        mutationFn: async ({ id, newParentId, position }) => {
            const res = await api.patch(`/blocks/${id}`, {
                parentId: newParentId,
                position
            });
            return res.data;
        },
        onSuccess: (updatedBlock) => {
            queryClient.setQueryData<Block>(
                ["blocks", "detail", updatedBlock.id],
                updatedBlock
            );

            queryClient.setQueryData<Block[]>(
                ["blocks", updatedBlock.pageId],
                (oldBlocks) => {
                    return oldBlocks?.map((block) =>
                        block.id === updatedBlock.id ? updatedBlock : block
                    );
                }
            );

            queryClient.invalidateQueries({
                queryKey: ["blocks", "hierarchy", updatedBlock.pageId]
            });
        },
    });
};

// Duplicate a block
export const useDuplicateBlock = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Block, Error, { blockId: string; pageId: string }>({
        mutationFn: async ({ blockId }) => {
            // Get the original block first
            const originalBlock = await api.get(`/blocks/${blockId}`);
            const block = originalBlock.data;

            // Create a new block with the same data
            const duplicateData: CreateBlockInput = {
                pageId: block.pageId,
                type: block.type,
                content: block.content,
                properties: block.properties,
                metadata: block.metadata,
                position: block.position + 0.1, // Place it right after the original
                parentId: block.parentId,
            };

            const res = await api.post("/blocks", duplicateData);
            return res.data;
        },
        onSuccess: (newBlock, { pageId }) => {
            queryClient.setQueryData<Block[]>(
                ["blocks", pageId],
                (oldBlocks) => {
                    return oldBlocks ? [...oldBlocks, newBlock] : [newBlock];
                }
            );

            queryClient.invalidateQueries({
                queryKey: ["blocks", "hierarchy", pageId]
            });
        },
    });
};

// Bulk operations
export const useBulkUpdateBlocks = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<void, Error, { updates: Array<{ id: string; data: UpdateBlockInput }> }>({
        mutationFn: async ({ updates }) => {
            const promises = updates.map(({ id, data }) =>
                api.patch(`/blocks/${id}`, data)
            );
            await Promise.all(promises);
        },
        onSuccess: (_, { updates }) => {
            // Get all unique pageIds from the updates
            const pageIds = [...new Set(
                updates.map(update => {
                    // We'd need to get the pageId somehow - this is a limitation
                    // For now, invalidate all block queries
                    return null;
                })
            )];

            // Invalidate all block queries for safety
            queryClient.invalidateQueries({ queryKey: ["blocks"] });
        },
    });
};

// ============================================================================
// UTILITY HOOKS
// ============================================================================

// Get blocks by type
export const useBlocksByType = (pageId?: string, type?: string) => {
    const { data: blocks = [] } = useBlocks(pageId);

    return {
        data: type ? blocks.filter(block => block.type === type) : blocks,
        isLoading: false, // Since it's derived from useBlocks
    };
};

// Get block count for a page
export const useBlockCount = (pageId?: string) => {
    const { data: blocks = [] } = useBlocks(pageId);

    return {
        total: blocks.length,
        byType: blocks.reduce((acc, block) => {
            acc[block.type] = (acc[block.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
    };
};
