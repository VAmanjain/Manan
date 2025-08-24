import React from "react"
import { cn } from "../../lib/utils"

interface TypographyProps {
  children: React.ReactNode
  className?: string
}

export function TypographyH1({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-serif font-bold tracking-tight lg:text-5xl",
        "animate-fade-in",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function TypographyH2({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-serif font-semibold tracking-tight first:mt-0",
        "animate-fade-in",
        className,
      )}
      {...props}
    >
      {children}
    </h2>
  )
}

export function TypographyH3({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("scroll-m-20 text-2xl font-serif font-semibold tracking-tight", "animate-fade-in", className)}
      {...props}
    >
      {children}
    </h3>
  )
}

export function TypographyH4({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn("scroll-m-20 text-xl font-serif font-semibold tracking-tight", "animate-fade-in", className)}
      {...props}
    >
      {children}
    </h4>
  )
}

export function TypographyP({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("leading-7 font-sans text-base [&:not(:first-child)]:mt-6", "animate-fade-in", className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function TypographyBlockquote({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLQuoteElement>) {
  return (
    <blockquote
      className={cn("mt-6 border-l-2 pl-6 italic font-serif text-lg", "animate-slide-in", className)}
      {...props}
    >
      {children}
    </blockquote>
  )
}

export function TypographyInlineCode({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLElement>) {
  return (
    <code
      className={cn("relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold", className)}
      {...props}
    >
      {children}
    </code>
  )
}

export function TypographyLead({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn("text-xl text-muted-foreground font-sans leading-relaxed", "animate-fade-in", className)}
      {...props}
    >
      {children}
    </p>
  )
}

export function TypographyLarge({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-lg font-semibold font-sans", "animate-fade-in", className)} {...props}>
      {children}
    </div>
  )
}

export function TypographySmall({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLElement>) {
  return (
    <small className={cn("text-sm font-medium leading-none font-sans", className)} {...props}>
      {children}
    </small>
  )
}

export function TypographyMuted({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground font-sans", className)} {...props}>
      {children}
    </p>
  )
}

export function EditorTitle({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        "text-5xl font-serif font-bold tracking-tight leading-tight",
        "text-foreground hover:text-primary transition-colors duration-200",
        "cursor-text focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-md px-2 py-1",
        "animate-fade-in",
        className,
      )}
      {...props}
    >
      {children}
    </h1>
  )
}

export function EditorContent({
  children,
  className,
  ...props
}: TypographyProps & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "prose prose-lg max-w-none",
        "prose-headings:font-serif prose-headings:tracking-tight",
        "prose-p:font-sans prose-p:leading-relaxed prose-p:text-foreground",
        "prose-strong:font-semibold prose-strong:text-foreground",
        "prose-em:italic prose-em:text-foreground",
        "prose-blockquote:font-serif prose-blockquote:italic prose-blockquote:border-l-primary",
        "prose-code:font-mono prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded",
        "dark:prose-invert",
        "animate-fade-in",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}
