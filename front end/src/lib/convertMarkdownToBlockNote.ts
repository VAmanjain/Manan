// Simple ID generator function
const generateId = (): string => {
  return `markdown-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

interface BlockNoteBlock {
  id: string
  type: string
  props: {
    textColor: string
    backgroundColor: string
    textAlignment: string
    level?: number
  }
  content: Array<{
    type: string
    text: string
    styles: Record<string, any>
  }>
  children: BlockNoteBlock[]
}

interface ParsedLine {
  type: string
  content: string
  level?: number
  indent?: number
  styles?: Record<string, any>
}

/**
 * Convert Markdown content to BlockNote format
 * @param markdown - The markdown string to convert
 * @returns Array of BlockNote blocks
 */
export const convertMarkdownToBlockNote = (markdown: string): BlockNoteBlock[] => {
  if (!markdown || typeof markdown !== 'string') {
    return createDefaultBlock()
  }

  const lines = markdown.split('\n')
  const blocks: BlockNoteBlock[] = []
  let currentListItems: BlockNoteBlock[] = []
  let currentListType: 'bullet' | 'numbered' | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const parsedLine = parseLine(line)

    // Handle list items
    if (parsedLine.type === 'bulletListItem' || parsedLine.type === 'numberedListItem') {
      // If switching list types or starting a new list
      if (currentListType !== (parsedLine.type === 'bulletListItem' ? 'bullet' : 'numbered')) {
        // Flush current list
        if (currentListItems.length > 0) {
          blocks.push(...currentListItems)
          currentListItems = []
        }
        currentListType = parsedLine.type === 'bulletListItem' ? 'bullet' : 'numbered'
      }

      currentListItems.push(createBlock(parsedLine))
    } else {
      // Flush any pending list items
      if (currentListItems.length > 0) {
        blocks.push(...currentListItems)
        currentListItems = []
        currentListType = null
      }

      // Handle regular blocks
      if (parsedLine.type === 'paragraph' && !parsedLine.content.trim()) {
        // Only add empty paragraphs if they're not at the start or if there are no blocks yet
        if (blocks.length > 0) {
          blocks.push(createBlock(parsedLine))
        }
      } else {
        blocks.push(createBlock(parsedLine))
      }
    }
  }

  // Flush any remaining list items
  if (currentListItems.length > 0) {
    blocks.push(...currentListItems)
  }

  // If no blocks were created, return a default empty paragraph
  if (blocks.length === 0) {
    return createDefaultBlock()
  }

  return blocks
}

/**
 * Parse a single line of markdown
 */
const parseLine = (line: string): ParsedLine => {
  const trimmedLine = line.trim()

  // Empty line
  if (!trimmedLine) {
    return {
      type: 'paragraph',
      content: '',
    }
  }

  // Headers (# ## ###)
  const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.*)$/)
  if (headerMatch) {
    const level = headerMatch[1].length
    return {
      type: 'heading',
      content: headerMatch[2],
      level,
    }
  }

  // Bullet list items (- or *)
  const bulletMatch = trimmedLine.match(/^[-*]\s+(.*)$/)
  if (bulletMatch) {
    return {
      type: 'bulletListItem',
      content: bulletMatch[1],
    }
  }

  // Numbered list items (1. 2. etc.)
  const numberedMatch = trimmedLine.match(/^\d+\.\s+(.*)$/)
  if (numberedMatch) {
    return {
      type: 'numberedListItem',
      content: numberedMatch[1],
    }
  }

  // Blockquote (>)
  const quoteMatch = trimmedLine.match(/^>\s+(.*)$/)
  if (quoteMatch) {
    return {
      type: 'blockquote',
      content: quoteMatch[1],
    }
  }

  // Code block detection (```)
  if (trimmedLine.startsWith('```')) {
    return {
      type: 'codeBlock',
      content: trimmedLine.replace(/^```\s*/, ''),
    }
  }

  // Regular paragraph
  return {
    type: 'paragraph',
    content: trimmedLine,
  }
}

/**
 * Create a BlockNote block from parsed line
 */
const createBlock = (parsedLine: ParsedLine): BlockNoteBlock => {
  const baseProps = {
    textColor: 'default',
    backgroundColor: 'default',
    textAlignment: 'left',
  }

  // Handle different block types
  switch (parsedLine.type) {
    case 'heading':
      return {
        id: generateId(),
        type: 'heading',
        props: {
          ...baseProps,
          level: parsedLine.level || 1,
        },
        content: parsedLine.content ? [createTextContent(parsedLine.content)] : [],
        children: [],
      }

    case 'bulletListItem':
      return {
        id: generateId(),
        type: 'bulletListItem',
        props: baseProps,
        content: parsedLine.content ? [createTextContent(parsedLine.content)] : [],
        children: [],
      }

    case 'numberedListItem':
      return {
        id: generateId(),
        type: 'numberedListItem',
        props: baseProps,
        content: parsedLine.content ? [createTextContent(parsedLine.content)] : [],
        children: [],
      }

    case 'blockquote':
      return {
        id: generateId(),
        type: 'blockquote',
        props: baseProps,
        content: parsedLine.content ? [createTextContent(parsedLine.content)] : [],
        children: [],
      }

    case 'codeBlock':
      return {
        id: generateId(),
        type: 'codeBlock',
        props: {
          ...baseProps,
          language: parsedLine.content || '',
        },
        content: [],
        children: [],
      }

    case 'paragraph':
    default:
      return {
        id: generateId(),
        type: 'paragraph',
        props: baseProps,
        content: parsedLine.content ? [createTextContent(parsedLine.content)] : [],
        children: [],
      }
  }
}

/**
 * Create text content with inline formatting
 */
const createTextContent = (text: string) => {
  // Handle basic inline formatting
  const styles: Record<string, any> = {}

  // Check for bold (**text** or __text__)
  let processedText = text
  const boldRegex = /\*\*(.*?)\*\*|__(.*?)__/g
  const italicRegex = /\*(.*?)\*|_(.*?)_/g
  const codeRegex = /`(.*?)`/g

  // For now, we'll keep it simple and just strip the markdown
  // In a more complete implementation, you'd want to split the text
  // and create multiple content objects with different styles
  processedText = processedText
    .replace(boldRegex, '$1$2')
    .replace(italicRegex, '$1$2')
    .replace(codeRegex, '$1')

  return {
    type: 'text',
    text: processedText,
    styles,
  }
}

/**
 * Create a default empty block
 */
const createDefaultBlock = (): BlockNoteBlock[] => {
  return [
    {
      id: generateId(),
      type: 'paragraph',
      props: {
        textColor: 'default',
        backgroundColor: 'default',
        textAlignment: 'left',
      },
      content: [],
      children: [],
    },
  ]
}

/**
 * Enhanced version that handles more complex inline formatting
 */
export const createAdvancedTextContent = (text: string) => {
  const segments = []
  let currentIndex = 0
  
  // Regex patterns for different formatting
  const patterns = [
    { regex: /\*\*(.*?)\*\*/g, style: 'bold' },
    { regex: /\*(.*?)\*/g, style: 'italic' },
    { regex: /`(.*?)`/g, style: 'code' },
    { regex: /~~(.*?)~~/g, style: 'strikethrough' },
  ]

  // This is a simplified version - a complete implementation would need
  // to handle overlapping and nested formatting properly
  segments.push({
    type: 'text',
    text: text,
    styles: {},
  })

  return segments[0] // Return the first segment for simplicity
}

// Usage example:
/*
const markdownContent = `# My Document

This is a paragraph with **bold** and *italic* text.

## Section 2

- First bullet point
- Second bullet point
  
1. Numbered item 1
2. Numbered item 2

> This is a blockquote

\`\`\`javascript
console.log("Hello World");
\`\`\`

Another paragraph here.`

const blockNoteBlocks = convertMarkdownToBlockNote(markdownContent)
*/