import {UserButton, SignedOut, SignedIn, SignInButton} from "@clerk/clerk-react";
import ThemeToggle from "./ThemeToggle.tsx";


const NavBar = () => {

    return (
        <>
            <div className="flex items-center justify-between p-4 ">
                <div>
                    <h1>Manan</h1>
                </div>
                <div className={`flex items-center gap-2 text-sm md:text-base md:gap-4`}>
                    <div>
                        <SignedIn>
                            <UserButton/>
                        </SignedIn>
                        <SignedOut>
                            <SignInButton/>
                        </SignedOut>
                    </div>
                    <div>
                        <ThemeToggle/>
                    </div>
                </div>
            </div>
        </>
    )
}

export default NavBar;