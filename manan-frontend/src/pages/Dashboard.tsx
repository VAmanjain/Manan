// src/pages/Dashboard.tsx
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/react-router";
import type {JSX} from "react";

export default function Dashboard(): JSX.Element {
    return (
        <>
            <SignedIn>
                <h1>Welcome to your dashboard</h1>
                <p>This content is only visible to authenticated users.</p>
            </SignedIn>
            <SignedOut>
                <RedirectToSignIn />
            </SignedOut>
        </>
    );
}
