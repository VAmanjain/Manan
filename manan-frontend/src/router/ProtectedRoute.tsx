// src/components/ProtectedRoute.tsx
import  type {ReactNode} from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
    children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
    const { isSignedIn, isLoaded } = useAuth();
    const location = useLocation();

    // Show loading spinner while Clerk is loading
    if (!isLoaded) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
            </div>
        );
    }

    // Redirect to landing page if not signed in
    if (!isSignedIn) {
        return <Navigate to="/" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
