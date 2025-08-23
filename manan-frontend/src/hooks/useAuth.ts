import { useEffect, useState } from "react";

import useApi from "../lib/axios";

export const useAuthUser = () => {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const api = useApi();
    useEffect(() => {
        const getUser = async () => {
            try {
                const res = await api.get("/auth/me",{
                    headers: {
                        "Cache-Control": "no-cache",
                    }
                });
                setUser(res.data);
            } catch (error) {
                console.error("Failed to fetch user", error);
            } finally {
                setLoading(false);
            }
        };

        getUser();
    }, []);

    return { user, loading };
};

