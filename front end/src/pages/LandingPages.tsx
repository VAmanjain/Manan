import type React from "react"
import { SignInButton, SignUpButton } from "@clerk/clerk-react"
import { Button } from "../components/ui/button"
import { ThemeToggle } from "../components/ThemeToggle"
import { FileText, Sparkles, Lock } from "lucide-react"

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <nav className="flex items-center justify-between p-6 border-b border-border/20 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-2xl font-heading font-bold text-foreground">Manan</span>
        </div>

        <div className="flex items-center space-x-4">
          <ThemeToggle />
          <SignInButton mode="modal">
            <Button variant="ghost" className="text-muted-foreground hover:text-foreground">
              Sign In
            </Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Get Started</Button>
          </SignUpButton>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-10">
          <h1 className="text-6xl lg:text-7xl font-heading font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent leading-tight">
            Your AI-Powered
            <br />
            Note-Taking Experience
          </h1>

          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Manan combines the power of block-based editing with intelligent AI assistance. Create, organize, and
            enhance your thoughts like never before.
          </p>

          <div className="flex items-center justify-center space-x-6 pt-8">
            <SignUpButton mode="modal">
              <Button
                size="lg"
                className="px-8 py-4 text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Start Writing Free
              </Button>
            </SignUpButton>

            <SignInButton mode="modal">
              <Button
                variant="outline"
                size="lg"
                className="px-8 py-4 text-lg border-border text-foreground hover:bg-accent/50 bg-transparent rounded-xl"
              >
                Sign In
              </Button>
            </SignInButton>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mt-32">
          <div className="text-center space-y-6 p-6">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-foreground">Block-Based Editing</h3>
            <p className="text-muted-foreground leading-relaxed">
              Modular content blocks that adapt to your thinking process and workflow.
            </p>
          </div>

          <div className="text-center space-y-6 p-6">
            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-foreground">AI-Powered Writing</h3>
            <p className="text-muted-foreground leading-relaxed">
              Intelligent suggestions and content generation to enhance your writing process.
            </p>
          </div>

          <div className="text-center space-y-6 p-6">
            <div className="w-16 h-16 bg-accent/10 rounded-2xl flex items-center justify-center mx-auto">
              <Lock className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-heading font-semibold text-foreground">Secure & Private</h3>
            <p className="text-muted-foreground leading-relaxed">
              Your data is encrypted and protected with enterprise-grade security.
            </p>
          </div>
        </div>

        <div className="text-center mt-32 space-y-8 p-12 bg-card/30 rounded-2xl border border-border/30">
          <h2 className="text-4xl font-heading font-bold text-foreground">Ready to transform your workflow?</h2>
          <p className="text-xl text-muted-foreground leading-relaxed">
            Join thousands of users who've already made the switch to smarter note-taking.
          </p>
          <SignUpButton mode="modal">
            <Button
              size="lg"
              className="px-8 py-4 text-lg bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Get Started Today
            </Button>
          </SignUpButton>
        </div>
      </main>

      <footer className="border-t border-border/30 mt-32 py-8 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 text-center text-muted-foreground">
          <p>&copy; 2024 Manan. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
