"use client"

import { useState, useEffect } from "react"
import { SignInButton, SignUpButton } from "@clerk/clerk-react"

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [activeFeature, setActiveFeature] = useState(0)

  useEffect(() => {
    setIsVisible(true)
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 3)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  const features = [
    {
      icon: "✍️",
      title: "Rich Text Editor",
      description: "Write with a powerful block-based editor that adapts to your needs",
    },
    {
      icon: "🎨",
      title: "Beautiful Design",
      description: "Elegant interface with customizable themes and layouts",
    },
    {
      icon: "🚀",
      title: "Lightning Fast",
      description: "Auto-save, real-time sync, and blazing fast performance",
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-card to-muted">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/5 to-secondary/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          <div
            className={`text-center transition-all duration-1000 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
          >
            <h1
              className="text-5xl md:text-7xl font-bold text-foreground mb-6"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Write. Create.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent animate-pulse-glow">
                Inspire.
              </span>
            </h1>
            <p
              className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto leading-relaxed"
              style={{ fontFamily: "var(--font-body)" }}
            >
              The most elegant writing experience you've ever had. Create beautiful documents with our intuitive
              block-based editor.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <SignUpButton>
                <button className="px-8 py-4 bg-primary text-primary-foreground rounded-xl text-lg font-semibold hover:bg-primary/90 transition-smooth shadow-lg animate-bounce-subtle focus-ring">
                  Start Writing Free
                </button>
              </SignUpButton>
              <SignInButton>
                <button className="px-8 py-4 border-2 border-primary text-primary rounded-xl text-lg font-semibold hover:bg-primary hover:text-primary-foreground transition-smooth focus-ring">
                  Sign In
                </button>
              </SignInButton>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-heading)" }}>
              Everything you need to write
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to make your writing experience seamless and enjoyable
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-8 rounded-2xl border transition-all duration-500 cursor-pointer ${
                  activeFeature === index
                    ? "bg-primary/5 border-primary shadow-lg scale-105"
                    : "bg-background border-border hover:border-primary/50 hover:shadow-md"
                }`}
                onMouseEnter={() => setActiveFeature(index)}
              >
                <div className="text-4xl mb-4 animate-bounce-subtle">{feature.icon}</div>
                <h3
                  className="text-xl font-semibold text-foreground mb-3"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {feature.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Demo Section */}
      <div className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-heading)" }}>
              See it in action
            </h2>
            <p className="text-xl text-muted-foreground">Experience the power of our editor</p>
          </div>

          <div className="bg-card rounded-3xl shadow-2xl p-8 border border-border">
            <div className="bg-background rounded-2xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-6">
                <div className="text-2xl">📝</div>
                <h3 className="text-lg font-semibold text-foreground" style={{ fontFamily: "var(--font-heading)" }}>
                  My First Document
                </h3>
              </div>
              <div className="space-y-4 text-muted-foreground">
                <div className="h-4 bg-muted rounded animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse"></div>
                <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-20 bg-gradient-to-r from-primary/10 to-accent/10">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-foreground mb-6" style={{ fontFamily: "var(--font-heading)" }}>
            Ready to start writing?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of writers who have made Manan their home for creativity
          </p>
          <SignUpButton>
            <button className="px-10 py-5 bg-primary text-primary-foreground rounded-xl text-xl font-semibold hover:bg-primary/90 transition-smooth shadow-xl animate-pulse-glow focus-ring">
              Get Started Today
            </button>
          </SignUpButton>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h3 className="text-2xl font-bold text-foreground mb-4" style={{ fontFamily: "var(--font-heading)" }}>
              Manan
            </h3>
            <p className="text-muted-foreground">The future of writing is here</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage
