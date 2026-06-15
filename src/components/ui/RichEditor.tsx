import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Minus,
  RemoveFormatting,
} from 'lucide-react';

type RichEditorProps = {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  readOnly?: boolean;
};

const toolbarItems = [
  { key: 'bold', icon: Bold, title: 'Bold', action: (e: Editor) => e.chain().focus().toggleBold().run() },
  { key: 'italic', icon: Italic, title: 'Italic', action: (e: Editor) => e.chain().focus().toggleItalic().run() },
  { key: 'hr', icon: Minus, title: 'Horizontal rule', action: (e: Editor) => e.chain().focus().setHorizontalRule().run() },
  { key: 'heading1', icon: Heading1, title: 'Heading 1', action: (e: Editor) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { key: 'heading2', icon: Heading2, title: 'Heading 2', action: (e: Editor) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { key: 'bulletList', icon: List, title: 'Bullet list', action: (e: Editor) => e.chain().focus().toggleBulletList().run() },
  { key: 'orderedList', icon: ListOrdered, title: 'Ordered list', action: (e: Editor) => e.chain().focus().toggleOrderedList().run() },
  { key: 'blockquote', icon: Quote, title: 'Blockquote', action: (e: Editor) => e.chain().focus().toggleBlockquote().run() },
  { key: 'clear', icon: RemoveFormatting, title: 'Clear formatting', action: (e: Editor) => e.chain().focus().clearNodes().unsetAllMarks().run() },
];

export default function RichEditor({ content, onChange, placeholder = 'Start writing...', minHeight = 240, readOnly = false }: RichEditorProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedOnChange = useCallback(
    (html: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange(html), 300);
    },
    [onChange]
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Typography,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editable: !readOnly,
    onUpdate: ({ editor: ed }) => {
      debouncedOnChange(ed.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'tiptap',
        style: `min-height: ${minHeight}px;`,
      },
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  if (!editor) {
    return (
      <div className="border border-[var(--danger-border)] rounded-[8px] p-4 text-center">
        <p className="text-sm text-[#A32D2D]">
          Failed to initialize editor. Please reload the page.
        </p>
      </div>
    );
  }

  const editorStyles = useMemo(() => `
    .tiptap {
      min-height: ${minHeight}px;
      padding: 12px 14px;
      font-size: 13px;
      line-height: 1.7;
      color: var(--text-primary);
      outline: none;
    }
    .tiptap h1 { font-size: 18px; font-weight: 600; margin: 16px 0 8px; }
    .tiptap h2 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; }
    .tiptap h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; }
    .tiptap p { margin: 0 0 10px; }
    .tiptap p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      color: var(--text-tertiary);
      float: left;
      height: 0;
      pointer-events: none;
    }
    .tiptap ul, .tiptap ol { padding-left: 20px; margin-bottom: 10px; }
    .tiptap blockquote { border-left: 3px solid var(--accent); padding-left: 12px; color: var(--text-secondary); }
    .tiptap hr { border: none; border-top: 1px solid var(--border-color); margin: 16px 0; }
    .tiptap code { background: var(--bg-secondary); padding: 2px 5px; border-radius: 3px; font-size: 12px; }
    .tiptap ul[data-type="taskList"] { list-style: none; padding-left: 0; }
    .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; }
    .tiptap ul[data-type="taskList"] li > label { margin-right: 8px; margin-top: 2px; }
  `, [minHeight]);

  return (
    <div className="border border-[var(--border-color)] rounded-[8px] focus-within:border-[var(--accent)] focus-within:ring-1 focus-within:ring-[var(--accent)]/20 overflow-hidden">
      {!readOnly && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[var(--border-color)] bg-[var(--bg-primary)] flex-wrap">
          {toolbarItems.map((item) => (
            <button
              key={item.key}
              title={item.title}
              onClick={() => item.action(editor)}
              className={`w-[28px] h-[28px] flex items-center justify-center rounded-[4px] transition-colors ${
                editor.isActive(item.key) || (item.key === 'heading1' && editor.isActive('heading', { level: 1 })) || (item.key === 'heading2' && editor.isActive('heading', { level: 2 }))
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
            >
              <item.icon size={14} />
            </button>
          ))}
        </div>
      )}

      <style>{editorStyles}</style>

      <EditorContent editor={editor} />
    </div>
  );
}
