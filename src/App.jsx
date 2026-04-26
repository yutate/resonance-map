import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, LayoutGrid, Move, Sparkles, GitBranch } from 'lucide-react'
import { MapNode } from './components/MapNode.jsx'
import { Edge } from './components/Edge.jsx'
import { BottomSheet } from './components/BottomSheet.jsx'
import { NoteModal } from './components/NoteModal.jsx'
import { ApiKeyBadge, ApiKeyModal } from './components/ApiKeyModal.jsx'
import { callClaude, hasApiKey } from './api.js'
import { BUSINESS_THEME, PHILOSOPHY_THEME, INITIAL_NODES, INITIAL_EDGES } from './themes.js'

let _id = 10
const newId = () => `n${++_id}`

function ToolbarBtn({ onClick, theme, title, children }) {
  const [hov, setHov] = useState(false)
  return (
    <motion.button
      onClick={onClick} title={title}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.94 }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: 'transparent',
        border: `1px solid ${hov ? theme.nodeAccent : theme.nodeBorder}`,
        borderRadius: 8, padding: '5px 10px',
        color: hov ? theme.nodeAccent : theme.nodeText,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
        transition: 'all 0.15s', fontFamily: 'monospace', fontSize: 11,
      }}
    >
      {children}
    </motion.button>
  )
}

export default function App() {
  const [mode, setMode] = useState('business')
  const [curation, setCuration] = useState('manual')
  const [nodes, setNodes] = useState(INITIAL_NODES)
  const [edges, setEdges] = useState(INITIAL_EDGES)
  const [selected, setSelected] = useState(null)
  const [vp, setVp] = useState({ x: 0, y: 0, scale: 1 })
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [noteTarget, setNoteTarget] = useState(null)
  const [provokeLoading, setProvokeLoading] = useState(false)
  const [, forceUpdate] = useState(0)
  const canvasRef = useRef(null)
  const pan = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 })

  const theme = mode === 'business' ? BUSINESS_THEME : PHILOSOPHY_THEME
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2

  // ── Canvas pan ──
  const onCanvasDown = (e) => {
    const el = e.target
    if (!el.dataset.bg && el !== canvasRef.current) return
    setSelected(null)
    pan.current = { active: true, sx: e.clientX, sy: e.clientY, ox: vp.x, oy: vp.y }
    const mv = (ev) => {
      if (!pan.current.active) return
      setVp(v => ({ ...v, x: pan.current.ox + (ev.clientX - pan.current.sx), y: pan.current.oy + (ev.clientY - pan.current.sy) }))
    }
    const up = () => { pan.current.active = false; window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up) }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }

  // ── Wheel zoom ──
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const onWheel = (e) => {
      e.preventDefault()
      const f = e.deltaY > 0 ? 0.93 : 1.07
      const r = el.getBoundingClientRect()
      const mx = e.clientX - r.left, my = e.clientY - r.top
      setVp(v => ({
        scale: Math.min(3, Math.max(0.15, v.scale * f)),
        x: mx - (mx - v.x) * f,
        y: my - (my - v.y) * f,
      }))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  // ── Node ops ──
  const updatePos = useCallback((id, x, y) =>
    setNodes(ns => ns.map(n => n.id === id ? { ...n, x, y } : n)), [])

  const updateText = useCallback((id, text) =>
    setNodes(ns => ns.map(n => n.id === id ? { ...n, text } : n)), [])

  const updateNote = useCallback((id, note) =>
    setNodes(ns => ns.map(n => n.id === id ? { ...n, note } : n)), [])

  const deleteNode = useCallback((id) => {
    // delete node and all descendants
    const toDelete = new Set()
    const collect = (nid) => {
      toDelete.add(nid)
      nodes.filter(n => n.parentId === nid).forEach(n => collect(n.id))
    }
    collect(id)
    setNodes(ns => ns.filter(n => !toDelete.has(n.id)))
    setEdges(es => es.filter(e => !toDelete.has(e.from) && !toDelete.has(e.to)))
    setSelected(s => toDelete.has(s) ? null : s)
  }, [nodes])

  const toggleChildren = useCallback((id) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, collapsed: !n.collapsed } : n))
  }, [])

  const toggleProvoke = useCallback((id) => {
    setNodes(ns => ns.map(n => n.id === id ? { ...n, provokeCollapsed: !n.provokeCollapsed } : n))
  }, [])

  const addNode = () => {
    const id = newId()
    const angle = Math.random() * Math.PI * 2
    const r = 200 + Math.random() * 100
    const anchor = (selected ? nodes.find(n => n.id === selected) : null) ?? nodes.find(n => n.isRoot)
    const ox = anchor?.x ?? 0, oy = anchor?.y ?? 0
    setNodes(ns => [...ns, {
      id, x: ox + Math.cos(angle) * r, y: oy + Math.sin(angle) * r,
      text: '新しいノード', isRoot: false, provoked: false, provokeData: null,
      collapsed: false, provokeCollapsed: false, note: '',
      parentId: anchor?.id || null,
    }])
    if (anchor) setEdges(es => [...es, { id: `e${newId()}`, from: anchor.id, to: id }])
    setSelected(id)
  }

  const provoke = useCallback(async (nodeId, nodeText) => {
    setProvokeLoading(true)
    try {
      const data = await callClaude(nodeText, mode)
      setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, provoked: true, provokeData: data, provokeCollapsed: false } : n))
      const parent = nodes.find(n => n.id === nodeId)
      if (!parent) return
      const id = newId()
      const angle = Math.random() * Math.PI * 2
      const r = 180 + Math.random() * 60
      setNodes(ns => [...ns, {
        id,
        x: parent.x + Math.cos(angle) * r,
        y: parent.y + Math.sin(angle) * r,
        text: data.label || '?',
        isRoot: false, provoked: true, provokeData: data,
        collapsed: false, provokeCollapsed: false, note: '',
        parentId: nodeId,
      }])
      setEdges(es => [...es, { id: `e${newId()}`, from: nodeId, to: id }])
    } finally {
      setProvokeLoading(false)
    }
  }, [mode, nodes])

  // ── Auto layout ──
  useEffect(() => {
    if (curation !== 'auto') return
    const root = nodes.find(n => n.isRoot)
    if (!root) return
    const children = nodes.filter(n => !n.isRoot)
    const total = children.length
    setNodes(prev => prev.map(n => {
      if (n.isRoot) return { ...n, x: 0, y: 0 }
      const idx = children.findIndex(c => c.id === n.id)
      return { ...n, x: 200, y: (idx - (total - 1) / 2) * 80 }
    }))
  }, [curation]) // eslint-disable-line

  // ── Collapsed nodes: hide descendants ──
  const collapsedIds = new Set(nodes.filter(n => n.collapsed).map(n => n.id))
  const hiddenIds = new Set()
  const buildHidden = (parentId) => {
    nodes.filter(n => n.parentId === parentId).forEach(n => {
      hiddenIds.add(n.id)
      buildHidden(n.id)
    })
  }
  collapsedIds.forEach(id => buildHidden(id))

  const visibleNodes = nodes.filter(n => !hiddenIds.has(n.id))
  const visibleNodeIds = new Set(visibleNodes.map(n => n.id))
  const visibleEdges = edges.filter(e => visibleNodeIds.has(e.from) && visibleNodeIds.has(e.to))
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
  const aiOn = hasApiKey()
  const selectedNodeObj = selected ? nodes.find(n => n.id === selected) : null
  const getChildCount = (id) => nodes.filter(n => n.parentId === id).length

  // attach callback refs for inline edit & toggle
  visibleNodes.forEach(n => {
    n._onTextCommit = (text) => updateText(n.id, text)
    n._onToggleProvoke = () => toggleProvoke(n.id)
  })

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: theme.bg, position: 'relative',
      fontFamily: theme.font,
      transition: 'background 0.5s',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pglow { 0%,100%{opacity:.5} 50%{opacity:1} }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>

      {/* Grid */}
      <div data-bg="1" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(${theme.grid} 1px, transparent 1px),
          linear-gradient(90deg, ${theme.grid} 1px, transparent 1px)
        `,
        backgroundSize: `${40 * vp.scale}px ${40 * vp.scale}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
      }} />

      {/* Canvas */}
      <div ref={canvasRef} onPointerDown={onCanvasDown} style={{ position: 'absolute', inset: 0 }}>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
          <g transform={`translate(${vp.x + cx},${vp.y + cy}) scale(${vp.scale})`}>
            {visibleEdges.map(e => {
              const f = nodeMap[e.from], t = nodeMap[e.to]
              return <Edge key={e.id} from={f} to={t} theme={theme} isProvoked={t?.provoked || f?.provoked} />
            })}
          </g>
        </svg>

        <div style={{ position: 'absolute', left: vp.x + cx, top: vp.y + cy, transform: `scale(${vp.scale})`, transformOrigin: '0 0' }}>
          <AnimatePresence>
            {visibleNodes.map(n => (
              <MapNode key={n.id} node={n} theme={theme}
                isSelected={selected === n.id}
                onSelect={setSelected}
                onMove={updatePos}
                scale={vp.scale}
                childCount={getChildCount(n.id)}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Top bar ── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: `linear-gradient(180deg,${theme.bg}f2 0%,transparent 100%)`,
        pointerEvents: 'none',
      }}>
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `1px solid ${theme.nodeAccent}55`,
            background: `radial-gradient(circle,${theme.nodeAccent}33,transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pglow 3s ease-in-out infinite',
          }}>
            <GitBranch size={13} color={theme.nodeAccent} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: theme.nodeText, letterSpacing: '0.06em' }}>
              RESONANCE MAP
            </div>
            <div style={{ fontSize: 9, color: theme.nodeAccent, letterSpacing: '0.18em', fontFamily: 'monospace' }}>
              {mode === 'business' ? 'BUSINESS OS' : 'PHILOSOPHY OS'}
            </div>
          </div>
          <ApiKeyBadge theme={theme} onOpen={() => setShowKeyModal(true)} />
        </div>

        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: theme.nodeText, opacity: 0.45, fontFamily: 'monospace', letterSpacing: '0.1em' }}>BUSINESS</span>
          <motion.div
            onClick={() => setMode(m => m === 'business' ? 'philosophy' : 'business')}
            style={{
              width: 52, height: 26, borderRadius: 13,
              background: theme.toggleBg, border: `1px solid ${theme.nodeBorder}`,
              cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center',
            }}
          >
            <motion.div
              animate={{ x: mode === 'business' ? 3 : 27 }}
              transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              style={{ width: 20, height: 20, borderRadius: '50%', background: theme.nodeAccent, boxShadow: `0 0 10px ${theme.nodeAccent}88` }}
            />
          </motion.div>
          <span style={{ fontSize: 11, color: theme.nodeText, opacity: 0.45, fontFamily: 'monospace', letterSpacing: '0.1em' }}>PHILOSOPHY</span>
        </div>
      </div>

      {/* ── Bottom toolbar ── */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', alignItems: 'center', gap: 8,
        background: mode === 'business' ? 'rgba(4,10,24,0.9)' : 'rgba(16,13,8,0.92)',
        border: `1px solid ${theme.nodeBorder}`,
        borderRadius: 16, padding: '8px 12px',
        backdropFilter: 'blur(16px)', boxShadow: theme.shadow,
      }}>
        <ToolbarBtn onClick={addNode} theme={theme} title="ノードを追加">
          <Plus size={14} /><span>ADD</span>
        </ToolbarBtn>
        <div style={{ width: 1, height: 20, background: theme.nodeBorder }} />
        <div style={{ display: 'flex', gap: 3 }}>
          {['manual', 'auto'].map(c => {
            const active = curation === c
            return (
              <motion.button key={c} onClick={() => setCuration(c)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                style={{
                  background: active ? `${theme.nodeAccent}22` : 'transparent',
                  border: `1px solid ${active ? theme.nodeAccent : theme.nodeBorder}`,
                  borderRadius: 8, padding: '5px 10px',
                  color: active ? theme.nodeAccent : theme.nodeText,
                  fontSize: 10, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.08em',
                  display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.2s',
                }}
              >
                {c === 'manual' ? <Move size={10} /> : <Sparkles size={10} />}
                {c.toUpperCase()}
              </motion.button>
            )
          })}
        </div>
        <div style={{ width: 1, height: 20, background: theme.nodeBorder }} />
        <ToolbarBtn onClick={() => setVp({ x: 0, y: 0, scale: 1 })} theme={theme} title="ビューをリセット">
          <LayoutGrid size={14} />
        </ToolbarBtn>
      </div>

      {/* Hint */}
      <div style={{
        position: 'absolute', top: 68, left: 20,
        fontSize: 10, color: theme.nodeText, opacity: 0.22,
        fontFamily: 'monospace', letterSpacing: '0.08em', lineHeight: 1.9, pointerEvents: 'none',
      }}>
        <div>TAP → MENU</div>
        <div>DBL-TAP → EDIT</div>
        <div>DRAG → MOVE / PAN</div>
        <div>SCROLL → ZOOM</div>
      </div>

      {/* Mode flash */}
      <AnimatePresence>
        <motion.div key={mode} initial={{ opacity: 0.2 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: mode === 'business'
              ? 'radial-gradient(ellipse at 50% 40%,rgba(0,120,255,0.18),transparent 65%)'
              : 'radial-gradient(ellipse at 50% 40%,rgba(180,150,80,0.14),transparent 65%)',
          }}
        />
      </AnimatePresence>

      {/* ── Bottom Sheet (node selected) ── */}
      {selected && !noteTarget && (
        <BottomSheet
          node={selectedNodeObj}
          theme={theme}
          aiOn={aiOn}
          isLoading={provokeLoading}
          childCount={getChildCount(selected)}
          onClose={() => setSelected(null)}
          onProvoke={provoke}
          onDelete={deleteNode}
          onToggleChildren={toggleChildren}
          onToggleProvoke={toggleProvoke}
          onEditNote={(id) => setNoteTarget(id)}
        />
      )}

      {/* ── Note Modal ── */}
      {noteTarget && (
        <NoteModal
          node={nodes.find(n => n.id === noteTarget)}
          theme={theme}
          onSave={updateNote}
          onClose={() => setNoteTarget(null)}
        />
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <ApiKeyModal theme={theme} onClose={() => { setShowKeyModal(false); forceUpdate(n => n + 1) }} />
      )}
    </div>
  )
}
