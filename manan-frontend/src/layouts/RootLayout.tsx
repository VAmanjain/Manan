// src/layouts/RootLayout.tsx
import { Outlet } from "react-router-dom";

import  type {JSX} from "react";
import Sidebar from "../components/Sidebar.tsx";

export default function RootLayout(): JSX.Element {
    return (
        <div className={`flex min-h-screen `}>
            <aside>
                <Sidebar />
            </aside>
            <main>
                <Outlet />
            </main>
        </div>
    );
}
