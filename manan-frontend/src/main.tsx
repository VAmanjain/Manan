import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from "./App.tsx";
import {queryClient} from "./lib/react-query.ts";
import {QueryClientProvider} from "@tanstack/react-query";
import "@blocknote/core/fonts/inter.css";     // Inter font
import "@blocknote/shadcn/style.css"; 



ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <QueryClientProvider client={queryClient}>

        <App/>
        </QueryClientProvider>
    </React.StrictMode>,
)