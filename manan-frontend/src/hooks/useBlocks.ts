import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import useApi from "../lib/axios"

export const useBlocks = (pageId: string | undefined) => {
    const queryClient = useQueryClient()
    const api = useApi()

    const { data, isLoading } = useQuery({
        queryKey: ["blocks", pageId],
        queryFn: async () => {
            try {
                const res = await api.get(`/blocks/pages/${pageId}`)
                console.log("Fetched blocks:", res.data)
                return res.data ?? []
            } catch (err) {
                console.error("Error fetching blocks:", err)
                return [] // still fallback to empty array
            }
        },
    })

    const createBlock = useMutation({
        mutationFn: async (payload: { pageId: string; type: string; content?: string; position?: number }) => {
            const res = await api.post(`/blocks`, payload)
            return res.data
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocks", pageId] })
        },
    })

    const updateBlock = useMutation({
        mutationFn: async ({
                               id,
                               content,
                               type,
                               metadata,
                               position,
                           }: { id: string; content?: string; type?: string; metadata?: string; position?: number }) => {
            console.log("Updating block with id:", id, "content:", content, "type:", type)
            await api.patch(`/blocks/${id}`, { content, type, metadata, position })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocks", pageId] })
        },
    })

    const deleteBlock = useMutation({
        mutationFn: async (blockId: string) => {
            await api.delete(`/blocks/${blockId}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocks", pageId] })
        },
    })

    const reorderBlocks = useMutation({
        mutationFn: async (payload: { pageId: string; blockIds: string[] }) => {
            // Assuming a backend endpoint to update block orders based on the provided blockIds array
            await api.post(`/blocks/reorder/${payload.pageId}`, { blockIds: payload.blockIds })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["blocks", pageId] })
        },
    })

    return { data, isLoading, createBlock, updateBlock, deleteBlock, reorderBlocks }
}
