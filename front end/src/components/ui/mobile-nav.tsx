"use client"

import type React from "react"
import { useState } from "react"
import { Menu } from "lucide-react"
import { Button } from "./button"
import { Sheet, SheetContent, SheetTrigger } from "./sheet"
import { ThemeToggle } from "./theme-toggle"
import { cn } from "../../lib/utils"

interface MobileNavProps {
  children?: React.ReactNode
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "md:hidden w-9 h-9 p-0 hover-lift transition-all duration-200",
            "hover:bg-accent/50 hover:scale-105",
          )}
        >
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 animate-slide-in">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-border/50">
            <h2 className="text-lg font-serif font-semibold">Navigation</h2>
            <ThemeToggle />
          </div>
          <div className="flex-1 overflow-auto p-6">{children}</div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
