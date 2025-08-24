"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

interface StaggeredFadeInProps {
  children: React.ReactNode[]
  className?: string
  delay?: number
}

export function StaggeredFadeIn({ children, className, delay = 100 }: StaggeredFadeInProps) {
  const [visibleItems, setVisibleItems] = useState<number[]>([])

  useEffect(() => {
    children.forEach((_, index) => {
      setTimeout(() => {
        setVisibleItems((prev) => [...prev, index])
      }, index * delay)
    })
  }, [children, delay])

  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className={cn(
            "transition-all duration-700 ease-out",
            visibleItems.includes(index) ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
