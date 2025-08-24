"use client"

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 p-3 bg-muted rounded-xl border border-border/50 w-fit">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
      </div>
      <span className="text-xs text-muted-foreground ml-2">AI is typing...</span>
    </div>
  )
}
