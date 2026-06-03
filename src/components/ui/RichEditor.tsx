import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Typography from '@tiptap/extension-typography';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback, useEffect, useRef } from 'react';
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

export default function RichEditor({ content, onChange, placeholder = 'Start writing...', minHeight = 240 }: RichEditorProps) {
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

  if (!editor) return null;

  return (
    <div className="border border-[#E5E5E3] rounded-[8px] focus-within:border-[#1D9E75] focus-within:ring-1 focus-within:ring-[#1D9E75]/20 overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#E5E5E3] bg-[#FAFAF9] flex-wrap">
        {toolbarItems.map((item) => (
          <button
            key={item.key}
            title={item.title}
            onClick={() => item.action(editor)}
            className={`w-[28px] h-[28px] flex items-center justify-center rounded-[4px] transition-colors ${
              editor.isActive(item.key) || (item.key === 'heading1' && editor.isActive('heading', { level: 1 })) || (item.key === 'heading2' && editor.isActive('heading', { level: 2 }))
                ? 'bg-[#1D9E75] text-white'
                : 'text-[#6B6B67] hover:bg-[#F1EFE8]'
            }`}
          >
            <item.icon size={14} />
          </button>
        ))}
      </div>

      <style>{`
        .tiptap {
          min-height: ${minHeight}px;
          padding: 12px 14px;
          font-size: 13px;
          line-height: 1.7;
          color: #1C1C1A;
          outline: none;
        }
        .tiptap h1 { font-size: 18px; font-weight: 600; margin: 16px 0 8px; }
        .tiptap h2 { font-size: 15px; font-weight: 600; margin: 14px 0 6px; }
        .tiptap h3 { font-size: 14px; font-weight: 600; margin: 12px 0 6px; }
        .tiptap p { margin: 0 0 10px; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          color: #A3A39E;
          float: left;
          height: 0;
          pointer-events: none;
        }
        .tiptap ul, .tiptap ol { padding-left: 20px; margin-bottom: 10px; }
        .tiptap blockquote { border-left: 3px solid #1D9E75; padding-left: 12px; color: #6B6B67; }
        .tiptap hr { border: none; border-top: 1px solid #E5E5E3; margin: 16px 0; }
        .tiptap code { background: #F1EFE8; padding: 2px 5px; border-radius: 3px; font-size: 12px; }
        .tiptap ul[data-type="taskList"] { list-style: none; padding-left: 0; }
        .tiptap ul[data-type="taskList"] li { display: flex; align-items: flex-start; }
        .tiptap ul[data-type="taskList"] li > label { margin-right: 8px; margin-top: 2px; }
      `}</style>

      <EditorContent editor={editor} />
    </div>
  );
}
