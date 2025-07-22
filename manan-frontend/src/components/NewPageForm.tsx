import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useCreatePage } from "../hooks/useCreatePage";

export default function NewPageForm() {
    const [title, setTitle] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const createPage = useCreatePage();
    const nav = useNavigate();
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
    const hasCreatedRef = useRef(false);

    useEffect(() => {
        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Don't auto-save if title is empty or already created
        if (!title.trim() || hasCreatedRef.current) {
            return;
        }

        // Set new timeout for auto-save
        timeoutRef.current = setTimeout(async () => {
            try {
                setIsSaving(true);
                const res = await createPage.mutateAsync(title);
                hasCreatedRef.current = true;
                // Navigate to the newly created page
                nav(`/home/pages/${res.id}`);
            } catch (error) {
                console.error("Failed to create page:", error);
                setIsSaving(false);
            }
        }, 5000); // 5 seconds

        // Cleanup timeout on unmount
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [title, createPage, nav]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!hasCreatedRef.current) {
            setTitle(e.target.value);
        }
    };

    return (
        <div className="flex flex-col space-y-2">
            <div className="flex space-x-2">
                <input
                    value={title}
                    onChange={handleInputChange}
                    placeholder="New page title"
                    className="border px-2 py-1 rounded flex-1"
                    disabled={isSaving || createPage.isPending}
                />
                {(isSaving || createPage.isPending) && (
                    <div className="flex items-center text-sm text-gray-500">
                        Creating...
                    </div>
                )}
            </div>
            {title.trim() && !hasCreatedRef.current && (
                <div className="text-sm text-gray-500">
                    Page will be created automatically in 5 seconds...
                </div>
            )}
        </div>
    );
}
