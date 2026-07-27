/**
 * MarkdownWidget - Live markdown editor with edit/preview/split view modes,
 * formatting toolbar, and localStorage persistence.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
// ICON: FileText - header icon and split view, replace with any document/file icon
// ICON: Eye - preview mode toggle, replace with any visibility icon
// ICON: Edit2 - edit mode toggle, replace with any pencil icon
// ICON: Bold - bold formatting, replace with any bold icon
// ICON: Italic - italic formatting, replace with any italic icon
// ICON: Heading - heading formatting, replace with any heading/typography icon
// ICON: Link - insert link, replace with any link/chain icon
// ICON: Code - insert code block, replace with any code/terminal icon
// ICON: List - insert list, replace with any bullet list icon
// ICON: Quote - insert blockquote, replace with any quote icon
// ICON: MoreHorizontal - menu trigger, replace with EllipsisVertical
// ICON: Trash2 - delete board action, replace with any delete icon
import {
  FileText,
  Eye,
  Edit2,
  Bold,
  Italic,
  Heading,
  Link,
  Code,
  List,
  Quote,
  MoreHorizontal,
  Trash2,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ViewMode = 'edit' | 'preview' | 'split';

interface MarkdownWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

// CHANGE: localStorage key and initial content
const STORAGE_KEY = 'dashboard_markdown';
const DEFAULT_CONTENT = '# Welcome\n\nStart writing in **Markdown**...\n\n- Item 1\n- Item 2';

const insertWrapper = (
  value: string,
  selectionStart: number,
  selectionEnd: number,
  before: string,
  after: string
) => {
  const selected = value.slice(selectionStart, selectionEnd);
  return value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
};

const wrapInline = (
  textarea: HTMLTextAreaElement,
  setContent: React.Dispatch<React.SetStateAction<string>>,
  wrapper: string
) => {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd) || wrapper;
  const result = insertWrapper(value, selectionStart, selectionEnd, wrapper, wrapper);
  setContent(result);
  setTimeout(() => {
    textarea.focus();
    const cursorPos = selectionStart + wrapper.length;
    textarea.setSelectionRange(
      cursorPos,
      cursorPos + (selectionStart === selectionEnd ? wrapper.length : selectionEnd - selectionStart)
    );
  }, 0);
};

const insertHeading = (textarea: HTMLTextAreaElement, setContent: React.Dispatch<React.SetStateAction<string>>) => {
  const { selectionStart, value } = textarea;
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const result = value.slice(0, lineStart) + '## ' + value.slice(lineStart);
  setContent(result);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(selectionStart + 3, selectionStart + 3);
  }, 0);
};

const insertLink = (textarea: HTMLTextAreaElement, setContent: React.Dispatch<React.SetStateAction<string>>) => {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd) || 'text';
  const result = insertWrapper(value, selectionStart, selectionEnd, '[', '](url)');
  setContent(result);
  setTimeout(() => {
    textarea.focus();
    const urlStart = selectionStart + selected.length + 3;
    textarea.setSelectionRange(urlStart, urlStart + 3);
  }, 0);
};

const insertBlock = (
  textarea: HTMLTextAreaElement,
  setContent: React.Dispatch<React.SetStateAction<string>>,
  prefix: string
) => {
  const { selectionStart, value } = textarea;
  const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
  const result = value.slice(0, lineStart) + prefix + ' ' + value.slice(lineStart);
  setContent(result);
  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(selectionStart + prefix.length + 1, selectionStart + prefix.length + 1);
  }, 0);
};

const insertCodeBlock = (textarea: HTMLTextAreaElement, setContent: React.Dispatch<React.SetStateAction<string>>) => {
  const { selectionStart, selectionEnd, value } = textarea;
  const selected = value.slice(selectionStart, selectionEnd) || 'code';
  const result = insertWrapper(value, selectionStart, selectionEnd, '\n```\n', '\n```\n');
  setContent(result);
  setTimeout(() => {
    textarea.focus();
    const innerStart = selectionStart + 5;
    textarea.setSelectionRange(innerStart, innerStart + selected.length);
  }, 0);
};

export default function MarkdownWidget({
  onDeleteBoard,
  alignMenu = 'right',
  onMenuToggle,
}: MarkdownWidgetProps) {
  const [content, setContent] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || DEFAULT_CONTENT;
    } catch {
      return DEFAULT_CONTENT;
    }
  });
  // CHANGE: Default view mode ('edit', 'preview', or 'split')
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  const toggleMenu = useCallback(
    (val: boolean) => {
      setIsMenuOpen(val);
      onMenuToggle?.(val);
    },
    [onMenuToggle]
  );

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, content);
    } catch (e) {
      console.warn('Failed to save markdown to localStorage', e);
    }
  }, [content]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;

  const toolbarButtons = [
    { icon: Bold, label: 'Bold', action: (ta: HTMLTextAreaElement) => wrapInline(ta, setContent, '**') },
    { icon: Italic, label: 'Italic', action: (ta: HTMLTextAreaElement) => wrapInline(ta, setContent, '*') },
    { icon: Heading, label: 'Heading', action: (ta: HTMLTextAreaElement) => insertHeading(ta, setContent) },
    { icon: Link, label: 'Link', action: (ta: HTMLTextAreaElement) => insertLink(ta, setContent) },
    { icon: Code, label: 'Code block', action: (ta: HTMLTextAreaElement) => insertCodeBlock(ta, setContent) },
    { icon: List, label: 'List', action: (ta: HTMLTextAreaElement) => insertBlock(ta, setContent, '-') },
    { icon: Quote, label: 'Quote', action: (ta: HTMLTextAreaElement) => insertBlock(ta, setContent, '>') },
  ];

  const handleToolAction = (action: (ta: HTMLTextAreaElement) => void) => {
    const ta = editorRef.current;
    if (ta) action(ta);
  };

  const viewModes: { mode: ViewMode; icon: typeof FileText; label: string }[] = [
    { mode: 'edit', icon: Edit2, label: 'Edit' },
    { mode: 'preview', icon: Eye, label: 'Preview' },
    { mode: 'split', icon: FileText, label: 'Split' },
  ];

  const renderEditor = () => (
    <textarea
      ref={editorRef}
      value={content}
      onChange={(e) => setContent(e.target.value)}
      className="w-full h-full min-h-[200px] bg-[#1a1a2e] text-gray-200 font-mono text-[12px] leading-relaxed outline-none resize-none p-3 rounded-xl scrollbar-thin"
      placeholder="Write markdown..."
      spellCheck={false}
    />
  );

  const renderPreview = () => (
    <div className="w-full h-full min-h-[200px] overflow-y-auto p-3 text-[12px] leading-relaxed prose prose-invert prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const isInline = !className;
            if (isInline) {
              return (
                <code className="bg-white/10 px-1 py-0.5 rounded text-[11px]" {...props}>
                  {children}
                </code>
              );
            }
            return (
              <pre className="bg-[#1a1a2e] rounded-xl p-3 overflow-x-auto my-2 border border-white/5">
                <code className={`${className} text-[11px]`} {...props}>
                  {children}
                </code>
              </pre>
            );
          },
          h1: ({ children, ...props }) => (
            <h1 className="text-lg font-bold text-white mb-2 mt-4" {...props}>
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2 className="text-base font-bold text-white mb-1.5 mt-3" {...props}>
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3 className="text-sm font-semibold text-white mb-1 mt-2" {...props}>
              {children}
            </h3>
          ),
          ul: ({ children, ...props }) => (
            <ul className="list-disc list-inside space-y-0.5 my-1.5 text-gray-300" {...props}>
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol className="list-decimal list-inside space-y-0.5 my-1.5 text-gray-300" {...props}>
              {children}
            </ol>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote className="border-l-2 border-indigo-400/50 pl-3 my-2 text-gray-400 italic" {...props}>
              {children}
            </blockquote>
          ),
          a: ({ children, href, ...props }) => (
            <a
              href={href}
              className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-2">
              <table className="w-full text-[11px] border-collapse" {...props}>
                {children}
              </table>
            </div>
          ),
          th: ({ children, ...props }) => (
            <th className="border border-white/10 px-2 py-1 bg-white/5 font-semibold text-left" {...props}>
              {children}
            </th>
          ),
          td: ({ children, ...props }) => (
            <td className="border border-white/10 px-2 py-1" {...props}>
              {children}
            </td>
          ),
          hr: (props) => <hr className="border-white/10 my-3" {...props} />,
          p: ({ children, ...props }) => (
            <p className="text-gray-300 my-1.5" {...props}>
              {children}
            </p>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );

  return (
    <div
      className={`dashboard-card dashboard-text-size w-full rounded-2xl p-4 text-white hover:border-white/15 transition-all duration-500 shadow-xl flex flex-col min-h-[280px] relative overflow-visible ${
        isMenuOpen ? 'z-50' : 'z-10 hover:z-20'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/5">
        <h3 className="text-xs font-semibold tracking-wider uppercase text-primary-accent font-display dashboard-text-weight flex items-center space-x-1.5">
          <FileText className="w-3.5 h-3.5" />
          <span>Markdown</span>
        </h3>
        <div className="flex items-center space-x-1 relative">
          <button
            onClick={() => toggleMenu(!isMenuOpen)}
            className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          <AnimatePresence>
            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => toggleMenu(false)} />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  className={`absolute top-8 w-44 bg-[#1d1b26]/95 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl p-1.5 z-[200] flex flex-col ${
                    alignMenu === 'left' ? 'left-0' : 'right-0'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteBoard) onDeleteBoard();
                      toggleMenu(false);
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-red-500/10 rounded-xl text-[13px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                    <span>Delete board</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* View Mode Tabs */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex bg-black/30 p-0.5 rounded-full text-[9px] uppercase tracking-wider font-semibold">
          {viewModes.map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-full transition-all ${
                viewMode === mode
                  ? 'bg-white/15 text-white shadow-sm font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <span className="text-[9px] text-gray-500 font-mono">
          {wordCount}w &middot; {charCount}c
        </span>
      </div>

      {/* Toolbar */}
      {viewMode !== 'preview' && (
        <div className="flex items-center space-x-1 mb-2 pb-1 border-b border-white/5 overflow-x-auto">
          {toolbarButtons.map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              onClick={() => handleToolAction(action)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
              title={label}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}

      {/* Editor / Preview Area */}
      <div className="flex-1 min-h-0">
        {viewMode === 'edit' && (
          <motion.div
            key="edit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full"
          >
            {renderEditor()}
          </motion.div>
        )}
        {viewMode === 'preview' && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full"
          >
            {renderPreview()}
          </motion.div>
        )}
        {viewMode === 'split' && (
          <motion.div
            key="split"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col sm:flex-row h-full space-y-2 sm:space-y-0 sm:space-x-2"
          >
            <div className="flex-1 min-w-0 min-h-0">{renderEditor()}</div>
            <div className="w-px bg-white/5 hidden sm:block" />
            <div className="flex-1 min-w-0 min-h-0">{renderPreview()}</div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
