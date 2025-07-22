import {ClerkProvider} from "@clerk/clerk-react";
import NavBar from "./components/NavBar.tsx";
import {RouterProvider} from "react-router-dom";
import {router} from "./router/Router.tsx";

export default function App() {

// Import your Publishable Key
    const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
    console.log(PUBLISHABLE_KEY)

    if (!PUBLISHABLE_KEY) {
        throw new Error('Missing Publishable Key')
    }

    return (
        <>
            <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl='/'>
                <NavBar/>
                <RouterProvider router={router} />
            </ClerkProvider>
        </>
    );
}
