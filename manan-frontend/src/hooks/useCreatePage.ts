import { useMutation, useQueryClient } from "@tanstack/react-query"
import useApi from "../lib/axios"

export const useCreatePage = () => {
    const qc = useQueryClient()
    const api = useApi()
    return useMutation({
        mutationFn: async (title: string) => {
            const response = await api.post("/pages", { title })
            return response.data
        },
        onSuccess: () => {
            // Invalidate the root-pages list so sidebar refetches
            qc.invalidateQueries({ queryKey: ["root-pages"] })
        },
    })
}
