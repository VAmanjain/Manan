import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import useApi from "../lib/axios";
import type {
    Page,
    CreatePageInput,
    UpdatePageInput,
    PageWithChildren,
    PageDetailResponse
} from "../types";

// ============================================================================
// QUERY HOOKS
// ============================================================================

// Get root pages only (pages without parentId)
export const useRootPages = () => {
    const api = useApi();
    return useQuery<Pick<Page, 'id' | 'title'>[]>({
        queryKey: ["pages", "root"],
        queryFn: async () => {
            const res = await api.get("pages/user");
            return res.data;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

// Get all pages for the user (including nested ones)
export const useAllPages = () => {
    const api = useApi();
    return useQuery<Page[]>({
        queryKey: ["pages", "all"],
        queryFn: async () => {
            const res = await api.get("/pages");
            return res.data;
        },
        staleTime: 3 * 60 * 1000, // 3 minutes
    });
};

// Get a specific page by ID
export const usePageById = (id?: string) => {
    const api = useApi();
    return useQuery<Page>({
        queryKey: ["pages", "detail", id],
        enabled: !!id,
        queryFn: async () => {
            const res = await api.get<PageDetailResponse>(`/pages/${id}`);
            return res.data.data;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
};

// Get child pages of a specific parent page
export const useChildPages = (parentId?: string) => {
    const api = useApi();
    return useQuery<Page[]>({
        queryKey: ["pages", "children", parentId],
        enabled: !!parentId,
        queryFn: async () => {
            const res = await api.get("/pages");
            const allPages: Page[] = res.data;
            return allPages.filter((page) => page.parentId === parentId);
        },
        staleTime: 2 * 60 * 1000,
    });
};

// Get page hierarchy (page with its children recursively)
export const usePageHierarchy = (pageId?: string) => {
    const api = useApi();
    return useQuery<PageWithChildren>({
        queryKey: ["pages", "hierarchy", pageId],
        enabled: !!pageId,
        queryFn: async () => {
            const [pageRes, allPagesRes] = await Promise.all([
                api.get<PageDetailResponse>(`/pages/${pageId}`),
                api.get<Page[]>("/pages")
            ]);

            const page = pageRes.data.data;
            const allPages = allPagesRes.data;

            // Build hierarchy recursively
            const buildHierarchy = (parentId: string): PageWithChildren[] => {
                return allPages
                    .filter((p) => p.parentId === parentId)
                    .map((child) => ({
                        ...child,
                        children: buildHierarchy(child.id)
                    }));
            };

            return {
                ...page,
                children: buildHierarchy(page.id)
            };
        },
        staleTime: 5 * 60 * 1000,
    });
};

// Get favorite pages
export const useFavoritePages = () => {
    const api = useApi();
    return useQuery<Page[]>({
        queryKey: ["pages", "favorites"],
        queryFn: async () => {
            const res = await api.get("/pages");
            const allPages: Page[] = res.data;
            return allPages.filter((page) => page.isFavorite);
        },
        staleTime: 3 * 60 * 1000,
    });
};

// Get published pages
export const usePublishedPages = () => {
    const api = useApi();
    return useQuery<Page[]>({
        queryKey: ["pages", "published"],
        queryFn: async () => {
            const res = await api.get("/pages");
            const allPages: Page[] = res.data;
            return allPages.filter((page) => page.isPublished && !page.isArchived);
        },
        staleTime: 5 * 60 * 1000,
    });
};

// ============================================================================
// MUTATION HOOKS
// ============================================================================

// Create a new page
export const useCreatePage = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Page, Error, CreatePageInput>({
        mutationFn: async (pageData) => {
            const res = await api.post<Page>("/pages", pageData);
            return res.data;
        },
        onSuccess: (newPage) => {
            // Invalidate all page-related queries
            queryClient.invalidateQueries({ queryKey: ["pages"] });

            // Optimistically add to cache for better UX
            queryClient.setQueryData<Page[]>(["pages", "all"], (oldPages) => {
                return oldPages ? [newPage, ...oldPages] : [newPage];
            });

            // If it's a root page, update root pages cache
            if (!newPage.parentId) {
                queryClient.setQueryData<Pick<Page, 'id' | 'title'>[]>(
                    ["pages", "root"],
                    (oldPages) => {
                        const newRootPage = { id: newPage.id, title: newPage.title };
                        return oldPages ? [newRootPage, ...oldPages] : [newRootPage];
                    }
                );
            }
        },
        onError: (error) => {
            console.error("Failed to create page:", error);
        },
    });
};

// Update an existing page
export const useUpdatePage = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Page, Error, { id: string; data: UpdatePageInput }>({
        mutationFn: async ({ id, data }) => {
            const res = await api.patch<Page>(`/pages/${id}`, data);
            return res.data;
        },
        onSuccess: (updatedPage) => {
            // Update the specific page in cache
            queryClient.setQueryData<Page>(
                ["pages", "detail", updatedPage.id],
                updatedPage
            );

            // Update in all pages list
            queryClient.setQueryData<Page[]>(["pages", "all"], (oldPages) => {
                return oldPages?.map((page) =>
                    page.id === updatedPage.id ? updatedPage : page
                );
            });

            // Invalidate dependent queries
            queryClient.invalidateQueries({ queryKey: ["pages", "children"] });
            queryClient.invalidateQueries({ queryKey: ["pages", "hierarchy"] });
            queryClient.invalidateQueries({ queryKey: ["pages", "favorites"] });
            queryClient.invalidateQueries({ queryKey: ["pages", "published"] });
        },
        onError: (error) => {
            console.error("Failed to update page:", error);
        },
    });
};

// Delete a page
export const useDeletePage = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<void, Error, string>({
        mutationFn: async (pageId) => {
            await api.delete(`/pages/${pageId}`);
        },
        onSuccess: (_, pageId) => {
            // Remove from cache
            queryClient.removeQueries({ queryKey: ["pages", "detail", pageId] });

            // Remove from all pages list
            queryClient.setQueryData<Page[]>(["pages", "all"], (oldPages) => {
                return oldPages?.filter((page) => page.id !== pageId);
            });

            // Remove from root pages if applicable
            queryClient.setQueryData<Pick<Page, 'id' | 'title'>[]>(
                ["pages", "root"],
                (oldPages) => {
                    return oldPages?.filter((page) => page.id !== pageId);
                }
            );

            // Invalidate all page queries to be safe
            queryClient.invalidateQueries({ queryKey: ["pages"] });
        },
        onError: (error) => {
            console.error("Failed to delete page:", error);
        },
    });
};

// Toggle page favorite status
export const useTogglePageFavorite = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Page, Error, { id: string; isFavorite: boolean }>({
        mutationFn: async ({ id, isFavorite }) => {
            const res = await api.patch<Page>(`/pages/${id}`, { isFavorite });
            return res.data;
        },
        onSuccess: (updatedPage) => {
            // Update page in cache
            queryClient.setQueryData<Page>(
                ["pages", "detail", updatedPage.id],
                updatedPage
            );

            // Update in all pages list
            queryClient.setQueryData<Page[]>(["pages", "all"], (oldPages) => {
                return oldPages?.map((page) =>
                    page.id === updatedPage.id ? updatedPage : page
                );
            });

            // Invalidate favorites query
            queryClient.invalidateQueries({ queryKey: ["pages", "favorites"] });
        },
        onError: (error) => {
            console.error("Failed to toggle page favorite:", error);
        },
    });
};

// Toggle page published status
export const useTogglePagePublished = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Page, Error, { id: string; isPublished: boolean }>({
        mutationFn: async ({ id, isPublished }) => {
            const res = await api.patch<Page>(`/pages/${id}`, { isPublished });
            return res.data;
        },
        onSuccess: (updatedPage) => {
            queryClient.setQueryData<Page>(
                ["pages", "detail", updatedPage.id],
                updatedPage
            );

            queryClient.setQueryData<Page[]>(["pages", "all"], (oldPages) => {
                return oldPages?.map((page) =>
                    page.id === updatedPage.id ? updatedPage : page
                );
            });

            queryClient.invalidateQueries({ queryKey: ["pages", "published"] });
        },
    });
};

// Archive/Unarchive page
export const useTogglePageArchived = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Page, Error, { id: string; isArchived: boolean }>({
        mutationFn: async ({ id, isArchived }) => {
            const res = await api.patch<Page>(`/pages/${id}`, { isArchived });
            return res.data;
        },
        onSuccess: (updatedPage) => {
            queryClient.setQueryData<Page>(
                ["pages", "detail", updatedPage.id],
                updatedPage
            );

            queryClient.setQueryData<Page[]>(["pages", "all"], (oldPages) => {
                return oldPages?.map((page) =>
                    page.id === updatedPage.id ? updatedPage : page
                );
            });

            queryClient.invalidateQueries({ queryKey: ["pages", "published"] });
        },
    });
};

// Move page (change parentId)
export const useMovePage = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Page, Error, { id: string; newParentId: string | null }>({
        mutationFn: async ({ id, newParentId }) => {
            const res = await api.patch<Page>(`/pages/${id}`, { parentId: newParentId });
            return res.data;
        },
        onSuccess: (updatedPage, { newParentId }) => {
            queryClient.setQueryData<Page>(
                ["pages", "detail", updatedPage.id],
                updatedPage
            );

            queryClient.setQueryData<Page[]>(["pages", "all"], (oldPages) => {
                return oldPages?.map((page) =>
                    page.id === updatedPage.id ? updatedPage : page
                );
            });

            // Invalidate hierarchy-related queries
            queryClient.invalidateQueries({ queryKey: ["pages", "children"] });
            queryClient.invalidateQueries({ queryKey: ["pages", "hierarchy"] });
            queryClient.invalidateQueries({ queryKey: ["pages", "root"] });
        },
    });
};

// Bulk operations
export const useBulkUpdatePages = () => {
    const api = useApi();
    const queryClient = useQueryClient();

    return useMutation<Page[], Error, { ids: string[]; data: UpdatePageInput }>({
        mutationFn: async ({ ids, data }) => {
            const promises = ids.map(id =>
                api.patch<Page>(`/pages/${id}`, data)
            );
            const responses = await Promise.all(promises);
            return responses.map(res => res.data);
        },
        onSuccess: () => {
            // Invalidate all page queries for safety
            queryClient.invalidateQueries({ queryKey: ["pages"] });
        },
    });
};
