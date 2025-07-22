import {useAuth} from "@clerk/clerk-react";
import { Navigate} from "react-router-dom";
import type {ReactNode} from "react";


interface ProtectedRouteProps {
    children: ReactNode;
}


const UnProtectedRoute:React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isSignedIn, isLoaded } = useAuth();


    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (isSignedIn) {
        return <Navigate to="/home" replace />;
    }
    return <>{children}</>;
}

export default UnProtectedRoute;