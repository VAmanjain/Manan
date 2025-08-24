// useApi.ts
import { useAuth } from "@clerk/clerk-react";
import axios from "axios";

const useApi = () => {
    const { getToken } = useAuth();

    const authorizedApi = axios.create({
        baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
    });

    authorizedApi.interceptors.request.use(async (config) => {
        const token = await getToken({template: "manan-backend"});
        // console.info(token)
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    });

    return authorizedApi;
};

export default useApi;
