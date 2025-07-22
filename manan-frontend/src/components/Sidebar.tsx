import { usePages } from "../hooks/usePages";
import { useCreatePage } from "../hooks/useCreatePage";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Search, FileText, Settings, Moon, Sun } from "lucide-react";
import { useState } from "react";

interface Page {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
}

interface SidebarProps {
    theme?: 'light' | 'dark';
    onThemeToggle?: () => void;
}

export default function Sidebar({ theme = 'light', onThemeToggle }: SidebarProps) {
    const { data: pages = [], isLoading, error } = usePages();
    const createPage = useCreatePage();
    const nav = useNavigate();
    const { id: currentPageId } = useParams<{ id: string }>();
    const [creating, setCreating] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    const handleCreate = async () => {
        setCreating(true);
        try {
            const res = await createPage.mutateAsync("Untitled");
            // Based on the fixed useCreatePage hook, res should be the response.data
            nav(`/home/pages/${res.id}`);
        } catch (error) {
            console.error("Failed to create page:", error);
        } finally {
            setCreating(false);
        }
    };

    const filteredPages = pages.filter((page: Page) =>
        page.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isDark = theme === 'dark';
    const sidebarClasses = `w-64 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'} border-r ${isDark ? 'border-gray-700' : 'border-gray-200'} h-screen flex flex-col`;

    return (
        <aside className={sidebarClasses}>
            {/* Header */}
            <div className={`p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between mb-4">
                    <h1 className="text-lg font-semibold">Workspace</h1>
                    <div className="flex items-center gap-2">
                        {onThemeToggle && (
                            <button
                                onClick={onThemeToggle}
                                className={`p-1.5 rounded-lg transition-colors ${
                                    isDark
                                        ? 'hover:bg-gray-700 text-gray-300'
                                        : 'hover:bg-gray-200 text-gray-600'
                                }`}
                                title="Toggle theme"
                            >
                                {isDark ? <Sun size={16} /> : <Moon size={16} />}
                            </button>
                        )}
                        <button
                            onClick={handleCreate}
                            disabled={creating}
                            className={`p-1.5 rounded-lg transition-colors ${
                                isDark
                                    ? 'hover:bg-gray-700 text-gray-300'
                                    : 'hover:bg-gray-200 text-gray-600'
                            } disabled:opacity-50`}
                            title="New page"
                        >
                            <Plus size={16} />
                        </button>
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search
                        size={16}
                        className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}
                    />
                    <input
                        type="text"
                        placeholder="Search pages..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                            isDark
                                ? 'bg-gray-800 border-gray-600 text-white placeholder-gray-400'
                                : 'bg-white border-gray-200 text-gray-900 placeholder-gray-500'
                        } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    />
                </div>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                    {/* Quick Actions */}
                    <div>
                        <h3 className={`text-xs font-medium uppercase tracking-wide mb-3 ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                            Quick Actions
                        </h3>
                        <div className="space-y-1">
                            <button
                                onClick={handleCreate}
                                disabled={creating}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                                    isDark
                                        ? 'hover:bg-gray-800 text-gray-300'
                                        : 'hover:bg-gray-100 text-gray-700'
                                } disabled:opacity-50`}
                            >
                                <Plus size={16} />
                                <span className="text-sm">
                                    {creating ? "Creating..." : "New Page"}
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* Pages */}
                    <div>
                        <h3 className={`text-xs font-medium uppercase tracking-wide mb-3 ${
                            isDark ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                            Pages ({filteredPages.length})
                        </h3>

                        {isLoading ? (
                            <div className="space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className={`h-8 rounded-lg animate-pulse ${
                                            isDark ? 'bg-gray-800' : 'bg-gray-200'
                                        }`}
                                    />
                                ))}
                            </div>
                        ) : error ? (
                            <div className={`text-sm ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                                Failed to load pages
                            </div>
                        ) : filteredPages.length === 0 ? (
                            <div className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                                {searchTerm ? "No pages found" : "No pages yet"}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredPages.map((page: Page) => (
                                    <button
                                        key={page.id}
                                        onClick={() => nav(`/pages/${page.id}`)}
                                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left ${
                                            currentPageId === page.id
                                                ? isDark
                                                    ? 'bg-blue-600 text-white'
                                                    : 'bg-blue-100 text-blue-900'
                                                : isDark
                                                    ? 'hover:bg-gray-800 text-gray-300'
                                                    : 'hover:bg-gray-100 text-gray-700'
                                        }`}
                                    >
                                        <FileText size={16} className="flex-shrink-0" />
                                        <span className="text-sm truncate">
                                            {page.title || "Untitled"}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className={`p-4 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isDark
                            ? 'hover:bg-gray-800 text-gray-300'
                            : 'hover:bg-gray-100 text-gray-700'
                    }`}
                >
                    <Settings size={16} />
                    <span className="text-sm">Settings</span>
                </button>
            </div>
        </aside>
    );
}
