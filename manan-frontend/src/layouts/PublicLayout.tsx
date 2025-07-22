// src/layouts/PublicLayout.tsx
import { Outlet } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';

const PublicLayout = () => {
    return (
        <div className="min-h-screen bg-background text-foreground">

            <main>
                <Outlet />
            </main>
        </div>
    );
};

export default PublicLayout;
