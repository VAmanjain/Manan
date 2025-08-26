import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { ClerkProvider, SignedIn, SignedOut } from "@clerk/clerk-react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Provider } from "react-redux"
import { store } from "./store/store"
import { ThemeProvider } from "./context/ThemeContext"
import { Toaster } from "./components/ui/toaster"
import ProtectedRoute from "./components/ProtectedRoute"
import LandingPage from "./pages/LandingPages"
import HomePage from "./pages/HomePage"
import EditorPage from "./pages/EditorPage"
import "./App.css"

// Initialize Clerk with your publishable key
const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!clerkPubKey) {
  throw new Error("Missing Publishable Key")
}

// Create a query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <QueryClientProvider client={queryClient}>
        <Provider store={store}>
          <ThemeProvider>
            <Router>
              <div className="min-h-screen w-screen bg-background text-foreground font-body antialiased">
                <Routes>
                  {/* Public Routes */}
                  <Route
                    path="/"
                    element={
                      <>
                        <SignedOut>
                          <LandingPage />
                        </SignedOut>
                        <SignedIn>
                          <ProtectedRoute>
                            <HomePage />
                          </ProtectedRoute>
                        </SignedIn>
                      </>
                    }
                  />

                  {/* Protected Routes */}
                  <Route
                    path="/home"
                    element={
                      <ProtectedRoute>
                        <HomePage />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/page/:pageId"
                    element={
                      <ProtectedRoute>
                        <EditorPage />
                      </ProtectedRoute>
                    }
                  />

                  {/* Catch all route */}
                  <Route
                    path="*"
                    element={
                      <>
                        <SignedOut>
                          <LandingPage />
                        </SignedOut>
                        <SignedIn>
                          <ProtectedRoute>
                            <HomePage />
                          </ProtectedRoute>
                        </SignedIn>
                      </>
                    }
                  />
                </Routes>
                <Toaster />
              </div>
            </Router>
          </ThemeProvider>
        </Provider>
      </QueryClientProvider>
    </ClerkProvider>
  )
}

export default App
