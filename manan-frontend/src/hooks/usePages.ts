import { useQuery } from "@tanstack/react-query";
import useApi from "../lib/axios.ts";


export const useRootPages = () => {
    const api = useApi();
    return useQuery({
        queryKey: ["root-pages"],
        queryFn: async () => {
            const res = await api.get("pages/user");
            return res.data; // expecting [{ id, title }]
        },
    });
};

export const usePages = () => {
    const api = useApi();

    return useQuery({
        queryKey: ["root-pages"],
        queryFn: () => api.get("/pages").then(res => res.data),
    });

}
// usePageById.ts

export const usePageById = (id?: string) => {

    const api = useApi();
    return useQuery({
        queryKey: ["page", id],
        enabled: !!id,
        queryFn: async () => {
            const res = await api.get(`/pages/${id}`);
            // console.log("response from API:", res.data); // ✅ Log here
            return res.data.data;
        },
    });
};

