import { useEffect } from "react";
export const useDebounce = (callback: () => void, delay: number, deps: any[]) => {
    useEffect(() => {
        const handler = setTimeout(() => callback(), delay);
        return () => clearTimeout(handler);
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps
};