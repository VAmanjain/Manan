export const typographyVariants = {
  // Heading variants using serif font
  h1: "scroll-m-20 text-4xl font-serif font-bold tracking-tight lg:text-5xl",
  h2: "scroll-m-20 border-b pb-2 text-3xl font-serif font-semibold tracking-tight first:mt-0",
  h3: "scroll-m-20 text-2xl font-serif font-semibold tracking-tight",
  h4: "scroll-m-20 text-xl font-serif font-semibold tracking-tight",

  // Body text variants using sans font
  body: "leading-7 font-sans text-base",
  lead: "text-xl text-muted-foreground font-sans leading-relaxed",
  large: "text-lg font-semibold font-sans",
  small: "text-sm font-medium leading-none font-sans",
  muted: "text-sm text-muted-foreground font-sans",

  // Special variants
  blockquote: "mt-6 border-l-2 pl-6 italic font-serif text-lg",
  code: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold",

  // Editor-specific variants
  editorTitle:
    "text-5xl font-serif font-bold tracking-tight leading-tight text-foreground hover:text-primary transition-colors duration-200",
  editorContent:
    "prose prose-lg max-w-none prose-headings:font-serif prose-headings:tracking-tight prose-p:font-sans prose-p:leading-relaxed",
} as const

export type TypographyVariant = keyof typeof typographyVariants

// Helper function to get typography classes
export function getTypographyClasses(variant: TypographyVariant): string {
  return typographyVariants[variant]
}

// Font feature settings for enhanced typography
export const fontFeatures = {
  default: '"kern" 1, "liga" 1, "calt" 1',
  numeric: '"kern" 1, "liga" 1, "calt" 1, "tnum" 1',
  oldstyle: '"kern" 1, "liga" 1, "calt" 1, "onum" 1',
  small_caps: '"kern" 1, "liga" 1, "calt" 1, "smcp" 1',
} as const

// Responsive typography scale
export const typographyScale = {
  xs: "text-xs",
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
  "6xl": "text-6xl",
} as const
