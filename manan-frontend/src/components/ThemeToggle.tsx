interface ThemeToggleProps {
  theme: string
  onToggle: () => void
}

const ThemeToggle = ({ theme, onToggle }: ThemeToggleProps) => {
  const isDark = theme === "dark"

  return (
    <button
      onClick={onToggle}
      className="p-2 md:p-3 rounded-lg bg-card hover:bg-muted text-foreground transition-colors border border-border hover:border-border/80 min-w-[44px] min-h-[44px] flex items-center justify-center"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <span className="text-lg md:text-xl">{isDark ? "☀️" : "🌙"}</span>
    </button>
  )
}

export default ThemeToggle
