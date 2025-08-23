// src/router.tsx
import { createBrowserRouter } from "react-router-dom"
import PublicLayout from "../layouts/PublicLayout"
import ProtectedRoute from "./ProtectedRoute"
import UnprotectedRoute from "./UnProtectedRoute.tsx"
import Home from "../pages/Home"
import Dashboard from "../pages/Dashboard"
import RootLayout from "../layouts/RootLayout.tsx"
import Pages from "../pages/Pages.tsx"
import PagesDetails from "../pages/PagesDetails.tsx"
import LandingPage from "../pages/Landing.tsx"

export const router = createBrowserRouter([
  // Public routes (unprotected)
  {
    path: "/",
    element: (
      <UnprotectedRoute>
        <PublicLayout />
      </UnprotectedRoute>
    ),
    children: [
      {
        index: true,
        element: <LandingPage />,
      },
    ],
  },
  // Protected routes (authenticated users only)
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <RootLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        path: "home",
        element: <Home />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "page",
        element: <Pages />,
      },
      {
        path: "pages/:id",
        element: <PagesDetails />,
      },
    ],
  },
  // Catch-all route for 404
  {
    path: "*",
    element: (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">404</h1>
          <p className="text-gray-600 dark:text-gray-400">Page not found</p>
        </div>
      </div>
    ),
  },
])
