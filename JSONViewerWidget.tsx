import React, { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Braces, Copy, Check, Trash2, MoreHorizontal, Download, Upload, Minimize2, Maximize2, Search, FileJson } from 'lucide-react'
import { proxyFetch } from '../lib/tauri-api'
// ICON: Braces, Copy, Check, Trash2, MoreHorizontal, Download, Upload, Minimize2, Maximize2, Search, FileJson

interface JSONViewerWidgetProps {
  onDeleteBoard?: () => void;
  alignMenu?: 'left' | 'right';
  onMenuToggle?: (isOpen: boolean) => void;
}

interface TreeNodeProps {
  data: any;
  path: string;
  level: number;
  searchTerm: string;
}

function highlightValue(val: any): React.ReactNode {
  if (typeof val === 'string') return <span className="text-emerald-400">"{val}"</span>
  if (typeof val === 'number') return <span className="text-amber-400">{val}</span>
  if (typeof val === 'boolean') return <span className="text-purple-400">{String(val)}</span>
  if (val === null) return <span className="text-gray-500">null</span>
  return <span className="text-gray-300">{String(val)}</span>
}

function TreeNode({ data, path, level, searchTerm }: TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [hoveredPath, setHoveredPath] = useState(false)

  if (data === null || typeof data !== 'object') {
    const display = highlightValue(data)
    const matches = searchTerm && path.toLowerCase().includes(searchTerm.toLowerCase())
    return (
      <div
        className={`flex items-center py-0.5 px-1 rounded text-xs font-mono ${matches ? 'bg-amber-500/20' : ''}`}
        style={{ paddingLeft: `${level * 16}px` }}
        onMouseEnter={() => setHoveredPath(true)}
        onMouseLeave={() => setHoveredPath(false)}
      >
        <span className="text-gray-500 text-[10px] mr-2 shrink-0">{path}</span>
        {display}
      </div>
    )
  }

  const isArray = Array.isArray(data)
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data)
  const openBrace = isArray ? '[' : '{'
  const closeBrace = isArray ? ']' : '}'
  const matches = searchTerm && path.toLowerCase().includes(searchTerm.toLowerCase())

  return (
    <div
      className={`text-xs font-mono ${matches ? 'bg-amber-500/20 rounded' : ''}`}
      style={{ paddingLeft: `${level * 16}px` }}
    >
      <div
        className="flex items-center gap-1 py-0.5 px-1 cursor-pointer hover:bg-white/5 rounded"
        onClick={() => setCollapsed(!collapsed)}
        onMouseEnter={() => setHoveredPath(true)}
        onMouseLeave={() => setHoveredPath(false)}
      >
        <motion.span animate={{ rotate: collapsed ? -90 : 0 }} className="text-gray-500 text-[10px]">▶</motion.span>
        <span className="text-gray-500 text-[10px] shrink-0">{path}</span>
        <span className="text-gray-400">{openBrace}</span>
        {collapsed && <span className="text-gray-600">... {entries.length} {isArray ? 'items' : 'keys'}</span>}
        {collapsed && <span className="text-gray-400">{closeBrace}</span>}
      </div>
      <AnimatePresence>
        {!collapsed && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {entries.map(([key, val]) => (
              <TreeNode
                key={String(key)}
                data={val}
                path={isArray ? `${path}[${key}]` : `${path}.${key}`}
                level={level + 1}
                searchTerm={searchTerm}
              />
            ))}
            <div className="text-gray-400 py-0.5 text-[10px]" style={{ paddingLeft: `${level * 16 + 8}px` }}>{closeBrace}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function getErrorWithLine(json: string): string {
  try {
    JSON.parse(json)
    return ''
  } catch (e: any) {
    const match = e.message?.match(/position\s+(\d+)/i)
    if (match) {
      const pos = parseInt(match[1])
      const line = json.substring(0, pos).split('\n').length
      return `Error at line ${line}: ${e.message}`
    }
    return e.message || 'Invalid JSON'
  }
}

export default function JSONViewerWidget({ onDeleteBoard, alignMenu = 'right', onMenuToggle }: JSONViewerWidgetProps) {
  // CHANGE: Added JSON viewer state
  const [input, setInput] = useState('')
  const [treeData, setTreeData] = useState<any>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showMenu, setShowMenu] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [urlInput, setUrlInput] = useState('')
  const [loadingUrl, setLoadingUrl] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const parseAndDisplay = (text: string) => {
    const err = getErrorWithLine(text)
    if (err) { setError(err); setTreeData(null); return }
    try {
      const parsed = JSON.parse(text)
      setTreeData(parsed)
      setError('')
    } catch { setError('Invalid JSON'); setTreeData(null) }
  }

  const format = () => {
    if (!input.trim()) return
    const err = getErrorWithLine(input)
    if (err) { setError(err); setTreeData(null); return }
    try {
      const formatted = JSON.stringify(JSON.parse(input), null, 2)
      setInput(formatted)
      parseAndDisplay(formatted)
    } catch (e: any) { setError(e.message); setTreeData(null) }
  }

  const minify = () => {
    if (!input.trim()) return
    const err = getErrorWithLine(input)
    if (err) { setError(err); setTreeData(null); return }
    try {
      const min = JSON.stringify(JSON.parse(input))
      setInput(min)
      parseAndDisplay(min)
    } catch (e: any) { setError(e.message); setTreeData(null) }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(input)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownload = () => {
    const blob = new Blob([input], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'data.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const loadFromUrl = async () => {
    if (!urlInput.trim()) return
    setLoadingUrl(true)
    try {
      const text = await proxyFetch(urlInput)
      setInput(text)
      parseAndDisplay(text)
      setUrlInput('')
    } catch (e: any) { setError(`Fetch failed: ${e.message}`); setTreeData(null) }
    setLoadingUrl(false)
  }

  const handleDelete = () => {
    setInput(''); setTreeData(null); setError(''); setSearchTerm('')
    localStorage.removeItem('json_viewer_data')
    onDeleteBoard?.()
  }

  const handleInputChange = (val: string) => {
    setInput(val)
    localStorage.setItem('json_viewer_data', val)
    if (val.trim()) parseAndDisplay(val)
    else { setTreeData(null); setError('') }
  }

  // CHANGE: Load persisted data on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('json_viewer_data')
    if (saved) { setInput(saved); parseAndDisplay(saved) }
  }, [])

  React.useEffect(() => { onMenuToggle?.(showMenu) }, [showMenu, onMenuToggle])

  return (
    <div className={`dashboard-card dashboard-text-size relative group ${expanded ? 'fixed inset-4 z-50' : ''}`}>
      <div className="flex items-center justify-between p-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <FileJson className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-white/90">JSON Viewer</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setExpanded(!expanded)} className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors" title={expanded ? 'Minimize' : 'Maximize'}>
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-md hover:bg-white/10 text-white/50 hover:text-white/80 transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                  className={`absolute top-full mt-1 ${alignMenu === 'left' ? 'right-0' : 'left-0'} bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-2xl py-1 z-50 min-w-[140px]`}>
                  <button onClick={handleDelete} className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-red-400 hover:bg-white/10">
                    <Trash2 className="w-3 h-3" /> Clear All
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        <textarea ref={textareaRef} value={input} onChange={(e) => handleInputChange(e.target.value)}
          placeholder='Paste JSON here...'
          className="w-full h-24 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-white/80 placeholder-white/30 resize-none focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/20 transition-all" />

        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={format} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-md transition-colors">
            <Braces className="w-3 h-3" /> Format
          </button>
          <button onClick={minify} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-md transition-colors">
            <Minimize2 className="w-3 h-3" /> Minify
          </button>
          <button onClick={handleCopy} disabled={!input} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-white/5 text-white/60 hover:bg-white/10 rounded-md transition-colors disabled:opacity-30">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <button onClick={handleDownload} disabled={!input} className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium bg-white/5 text-white/60 hover:bg-white/10 rounded-md transition-colors disabled:opacity-30">
            <Download className="w-3 h-3" /> Save
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Upload className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
            <input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadFromUrl()}
              placeholder="Load from URL..."
              className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] font-mono text-white/70 placeholder-white/30 focus:outline-none focus:border-emerald-400/50 transition-all" />
          </div>
          <button onClick={loadFromUrl} disabled={!urlInput.trim() || loadingUrl}
            className="px-2 py-1.5 text-[10px] font-medium bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-md transition-colors disabled:opacity-30">
            {loadingUrl ? '...' : 'Fetch'}
          </button>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-[10px] text-red-400 font-mono break-all">
            {error}
          </div>
        )}

        {treeData && (
          <>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
              <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search keys..."
                className="w-full bg-black/30 border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-[10px] font-mono text-white/70 placeholder-white/30 focus:outline-none focus:border-emerald-400/50 transition-all" />
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg p-2 max-h-64 overflow-auto">
              <TreeNode data={treeData} path="$" level={0} searchTerm={searchTerm} />
            </div>
          </>
        )}

        {!treeData && !error && !input && (
          <div className="text-center py-6 text-white/20 text-[10px]">
            <Braces className="w-6 h-6 mx-auto mb-2 opacity-50" />
            Paste JSON to visualize
          </div>
        )}
      </div>
    </div>
  )
}
