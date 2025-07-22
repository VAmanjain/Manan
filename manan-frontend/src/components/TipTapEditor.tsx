// components/TipTapEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'

const TipTapEditor = ({ content, onUpdate }: { content: string; onUpdate: (text: string) => void }) => {
    const editor = useEditor({
        extensions: [StarterKit],
        content,
        onUpdate: ({ editor }) => {
            onUpdate(editor.getHTML())
        },
    })

    return (
        <div className="border rounded p-2">
            <EditorContent editor={editor} />
        </div>
    )
}

export default TipTapEditor
