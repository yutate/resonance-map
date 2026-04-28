import { useState, useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, LayoutGrid, Move, Sparkles, GitBranch } from 'lucide-react'
import { MapNode } from './components/MapNode.jsx'
import { Edge, DraftEdge } from './components/Edge.jsx'
import { BottomSheet } from './components/BottomSheet.jsx'
import { NoteModal } from './components/NoteModal.jsx'
import { EditTextModal } from './components/EditTextModal.jsx'
import { AutoExpandOverlay } from './components/AutoExpand.jsx'
import { ApiKeyBadge, ApiKeyModal } from './components/ApiKeyModal.jsx'
import { MapManagerBtn, MapManagerModal } from './components/MapManager.jsx'
import { callClaude, hasApiKey, autoExpand } from './api.js'
import { saveMap, loadMap, getLastMapId } from './storage.js'
import { BUSINESS_THEME, PHILOSOPHY_THEME, INITIAL_NODES, INITIAL_EDGES } from './themes.js'

let _id = 10
const newId = () => `n${++_id}`
const genMapId = () => `map-${Date.now()}`

function ToolbarBtn({ onClick, theme, title, children }) {
  const [hov, setHov] = useState(false)
  return (
    <motion.button onClick={onClick} title={title}
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
    >{children}</motion.button>
  )
}

// ── Load initial state from localStorage ──
function getInitialState() {
  const lastId = getLastMapId()
  if (lastId) {
    const m = loadMap(lastId)
    if (m) return { mapId: lastId, mapName: m.name, nodes: m.nodes, edges: m.edges }
  }
  return { mapId: genMapId(), mapName: '無題のマップ', nodes: INITIAL_NODES, edges: INITIAL_EDGES }
}

export default function App() {
  const init = getInitialState()
  const [mode, setMode] = useState('business')
  const [curation, setCuration] = useState('manual')
  const [nodes, setNodes] = useState(init.nodes)
  const [edges, setEdges] = useState(init.edges)
  const [mapId, setMapId] = useState(init.mapId)
  const [mapName, setMapName] = useState(init.mapName)
  const [selected, setSelected] = useState(null)
  const [vp, setVp] = useState({ x: 0, y: 0, scale: 1 })
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [showMapManager, setShowMapManager] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [noteTarget, setNoteTarget] = useState(null)
  const [editTextTarget, setEditTextTarget] = useState(null)
  const [connectFrom, setConnectFrom] = useState(null)
  const [provokeLoading, setProvokeLoading] = useState(false)
  const [dualLoading, setDualLoading] = useState(false)
  const [autoSaveFlash, setAutoSaveFlash] = useState(false)
  const [dragConnect, setDragConnect] = useState(null)
  const [autoExpanding, setAutoExpanding] = useState(false)
  const [expandProgress, setExpandProgress] = useState({ done: 0, total: 20, texts: [] }) // { fromId, wx, wy } world coords
  const [, forceUpdate] = useState(0)
  const canvasRef = useRef(null)
  const svgRef = useRef(null)
  const pan = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 })
  const autoSaveTimer = useRef(null)

  // ── Zoom fit ──
  const zoomFit = useCallback((targetNodes) => {
    const ns = targetNodes || nodes
    if (!ns.length || !canvasRef.current) return
    const pad = 100
    const minX = Math.min(...ns.map(n => n.x)) - pad
    const maxX = Math.max(...ns.map(n => n.x)) + pad
    const minY = Math.min(...ns.map(n => n.y)) - pad
    const maxY = Math.max(...ns.map(n => n.y)) + pad
    const cw = canvasRef.current.offsetWidth
    const ch = canvasRef.current.offsetHeight
    const scaleX = cw / (maxX - minX || 1)
    const scaleY = ch / (maxY - minY || 1)
    const scale = Math.min(scaleX, scaleY, 1.2)
    setVp({
      scale,
      x: cw / 2 - ((minX + maxX) / 2) * scale,
      y: ch / 2 - ((minY + maxY) / 2) * scale,
    })
  }, [nodes])

  // Auto fit on first mount
  useEffect(() => {
    setTimeout(() => zoomFit(), 100)
  }, []) // eslint-disable-line

  const theme = mode === 'business' ? BUSINESS_THEME : PHILOSOPHY_THEME
  const cx = window.innerWidth / 2
  const cy = window.innerHeight / 2

  // ── Auto save (debounced 2s) ──
  useEffect(() => {
    clearTimeout(autoSaveTimer.current)
    autoSaveTimer.current = setTimeout(() => {
      saveMap(mapId, mapName, nodes, edges)
      setAutoSaveFlash(true)
      setTimeout(() => setAutoSaveFlash(false), 1000)
    }, 2000)
    return () => clearTimeout(autoSaveTimer.current)
  }, [nodes, edges, mapId, mapName])

  // ── Canvas: 背景タップ→選択解除、背景ドラッグ→パン（PC・タッチ共通）──
  const onCanvasDown = (e) => {
    const el = e.target
    const isBackground = el.dataset.bg ||
      el === canvasRef.current ||
      el === svgRef.current ||
      el.tagName === 'svg' ||
      (el.tagName === 'path' && !el.onclick) // エッジのhit areaでない素のpath
    if (!isBackground) return
    if (connectFrom) { setConnectFrom(null); return }
    setSelected(null)
    setSheetOpen(false)
    pan.current = { active: true, sx: e.clientX, sy: e.clientY, ox: vp.x, oy: vp.y }
    const mv = (ev) => {
      if (!pan.current.active) return
      setVp(v => ({ ...v, x: pan.current.ox + (ev.clientX - pan.current.sx), y: pan.current.oy + (ev.clientY - pan.current.sy) }))
    }
    const up = () => {
      pan.current.active = false
      window.removeEventListener('pointermove', mv)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', mv)
    window.addEventListener('pointerup', up)
  }

  // ── Touch: 2本指パン＋ピンチズーム（refで最新vpを参照）──
  const vpRef = useRef(vp)
  useEffect(() => { vpRef.current = vp }, [vp])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return

    const touchMap = new Map()
    let pinch = null // { dist0, scale0, mx0, my0, vpX0, vpY0 }
    let pan2 = null  // { mx0, my0, vpX0, vpY0 }

    const getArr = () => [...touchMap.values()]

    const onStart = (e) => {
      for (const t of e.changedTouches) {
        touchMap.set(t.identifier, { x: t.clientX, y: t.clientY })
      }
      const arr = getArr()
      if (arr.length === 2) {
        const [a, b] = arr
        const d = Math.hypot(b.x - a.x, b.y - a.y)
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        const { x: vpX, y: vpY, scale } = vpRef.current
        pinch = { dist0: d, scale0: scale, mx0: mx, my0: my, vpX0: vpX, vpY0: vpY }
        pan2 = { mx0: mx, my0: my, vpX0: vpX, vpY0: vpY }
      }
    }

    const onMove = (e) => {
      e.preventDefault()
      for (const t of e.changedTouches) {
        touchMap.set(t.identifier, { x: t.clientX, y: t.clientY })
      }
      const arr = getArr()
      if (arr.length < 2 || !pinch) return

      const [a, b] = arr
      const newDist = Math.hypot(b.x - a.x, b.y - a.y)
      const newMx = (a.x + b.x) / 2
      const newMy = (a.y + b.y) / 2

      const factor = newDist / pinch.dist0
      const newScale = Math.min(4, Math.max(0.15, pinch.scale0 * factor))

      // Zoom around initial midpoint
      const zoomX = pinch.mx0 - (pinch.mx0 - pinch.vpX0) * (newScale / pinch.scale0)
      const zoomY = pinch.my0 - (pinch.my0 - pinch.vpY0) * (newScale / pinch.scale0)

      // Pan: midpoint movement
      const panDx = newMx - pinch.mx0
      const panDy = newMy - pinch.my0

      setVp({ scale: newScale, x: zoomX + panDx, y: zoomY + panDy })
    }

    const onEnd = (e) => {
      for (const t of e.changedTouches) touchMap.delete(t.identifier)
      if (touchMap.size < 2) { pinch = null; pan2 = null }
    }

    el.addEventListener('touchstart', onStart, { passive: true })
    el.addEventListener('touchmove', onMove, { passive: false })
    el.addEventListener('touchend', onEnd, { passive: true })
    el.addEventListener('touchcancel', onEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onStart)
      el.removeEventListener('touchmove', onMove)
      el.removeEventListener('touchend', onEnd)
      el.removeEventListener('touchcancel', onEnd)
    }
  }, []) // 空配列: 一度だけ登録、vpはrefで最新を参照

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

  const changeColor = useCallback((id, colorKey) =>
    setNodes(ns => ns.map(n => n.id === id ? { ...n, colorKey } : n)), [])

  const deleteNode = useCallback((id) => {
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

  const toggleChildren = useCallback((id) =>
    setNodes(ns => ns.map(n => n.id === id ? { ...n, collapsed: !n.collapsed } : n)), [])

  const toggleProvoke = useCallback((id) =>
    setNodes(ns => ns.map(n => n.id === id ? { ...n, provokeCollapsed: !n.provokeCollapsed } : n)), [])

  const addNode = () => {
    const id = newId()
    const angle = Math.random() * Math.PI * 2
    const r = 200 + Math.random() * 100
    const anchor = (selected ? nodes.find(n => n.id === selected) : null) ?? nodes.find(n => n.isRoot)
    const ox = anchor?.x ?? 0, oy = anchor?.y ?? 0
    setNodes(ns => [...ns, {
      id, x: ox + Math.cos(angle) * r, y: oy + Math.sin(angle) * r,
      text: '新しいノード', isRoot: false, provoked: false, provokeData: null,
      collapsed: false, provokeCollapsed: false, note: '', parentId: anchor?.id || null,
    }])
    if (anchor) setEdges(es => [...es, { id: `e${newId()}`, from: anchor.id, to: id }])
    setSelected(id)
  }

  // ── Provoke ──
  const provoke = useCallback(async (nodeId, nodeText) => {
    setProvokeLoading(true)
    try {
      const data = await callClaude(nodeText, mode)
      setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, provoked: true, provokeData: data, provokeCollapsed: false } : n))
      const parent = nodes.find(n => n.id === nodeId)
      if (!parent) return
      const id = newId()
      const angle = Math.random() * Math.PI * 2
      setNodes(ns => [...ns, {
        id, x: parent.x + Math.cos(angle) * 180, y: parent.y + Math.sin(angle) * 180,
        text: data.label || '?', isRoot: false,
        provoked: true, provokeData: data,
        collapsed: false, provokeCollapsed: false, note: '', parentId: nodeId,
      }])
      setEdges(es => [...es, { id: `e${newId()}`, from: nodeId, to: id }])
    } finally { setProvokeLoading(false) }
  }, [mode, nodes])

  // ── Dual Provoke ──
  const dualProvoke = useCallback(async (nodeId, nodeText) => {
    setDualLoading(true)
    try {
      const [biz, phi] = await Promise.all([
        callClaude(nodeText, 'business'),
        callClaude(nodeText, 'philosophy'),
      ])
      const dualData = { mode: 'dual', business: biz, philosophy: phi, label: 'DUAL', text: '' }
      setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, provoked: true, provokeData: dualData, provokeCollapsed: false } : n))
      const parent = nodes.find(n => n.id === nodeId)
      if (!parent) return
      for (const [data, angle] of [[biz, -0.4], [phi, 0.4]]) {
        const id = newId()
        setNodes(ns => [...ns, {
          id, x: parent.x + Math.cos(angle) * 200, y: parent.y + Math.sin(angle) * 200,
          text: data.label || '?', isRoot: false,
          provoked: true, provokeData: { ...data },
          collapsed: false, provokeCollapsed: false, note: '', parentId: nodeId,
        }])
        setEdges(es => [...es, { id: `e${newId()}`, from: nodeId, to: id }])
      }
    } finally { setDualLoading(false) }
  }, [nodes])

  // ── Auto Expand ──
  const handleAutoExpand = useCallback(async (rootNodeId, rootText) => {
    setAutoExpanding(true)
    setExpandProgress({ done: 0, total: 20, texts: [] })
    try {
      const items = await autoExpand(rootText, mode)

      // Build id map: text → id
      const textToId = { root: rootNodeId }
      const newNodes = []
      const newEdges = []

      // Layout: depth-1 in ring around root, depth-2 around each depth-1
      const depth1Items = items.filter(i => i.depth === 1)
      const depth2Items = items.filter(i => i.depth === 2)

      const ROOT_R = 220
      const CHILD_R = 160

      // Place depth-1
      depth1Items.forEach((item, idx) => {
        const angle = (idx / depth1Items.length) * Math.PI * 2 - Math.PI / 2
        const rootNode = nodes.find(n => n.id === rootNodeId)
        const rx = rootNode?.x ?? 0, ry = rootNode?.y ?? 0
        const id = newId()
        textToId[item.text] = id
        newNodes.push({
          id, text: item.text,
          x: rx + Math.cos(angle) * ROOT_R,
          y: ry + Math.sin(angle) * ROOT_R,
          isRoot: false, provoked: false, provokeData: null,
          collapsed: false, provokeCollapsed: false, note: '',
          parentId: rootNodeId,
          _angle: angle, _rx: rx + Math.cos(angle) * ROOT_R, _ry: ry + Math.sin(angle) * ROOT_R,
        })
        newEdges.push({ id: `e${newId()}`, from: rootNodeId, to: id })
      })

      // Place depth-2
      depth2Items.forEach((item) => {
        const parentId = textToId[item.parent]
        if (!parentId) return
        const parentNode = newNodes.find(n => n.id === parentId)
        if (!parentNode) return
        const siblings = depth2Items.filter(i => i.parent === item.parent)
        const sibIdx = siblings.indexOf(item)
        const baseAngle = parentNode._angle ?? 0
        const spread = Math.PI * 0.7
        const angle = baseAngle + (sibIdx - (siblings.length - 1) / 2) * (spread / Math.max(siblings.length - 1, 1))
        const id = newId()
        textToId[item.text] = id
        newNodes.push({
          id, text: item.text,
          x: parentNode.x + Math.cos(angle) * CHILD_R,
          y: parentNode.y + Math.sin(angle) * CHILD_R,
          isRoot: false, provoked: false, provokeData: null,
          collapsed: false, provokeCollapsed: false, note: '',
          parentId,
        })
        newEdges.push({ id: `e${newId()}`, from: parentId, to: id })
      })

      // Animate nodes appearing one by one
      for (let i = 0; i < newNodes.length; i++) {
        await new Promise(r => setTimeout(r, 60))
        setNodes(prev => [...prev, newNodes[i]])
        setEdges(prev => [...prev, newEdges[i]])
        setExpandProgress(p => ({ ...p, done: i + 1, texts: [...p.texts, newNodes[i].text] }))
      }

    } catch (err) {
      console.error('Auto expand failed:', err)
    } finally {
      setAutoExpanding(false)
      setExpandProgress({ done: 0, total: 20, texts: [] })
    }
  }, [mode, nodes])
  const startConnect = useCallback((fromId) => {
    setConnectFrom(fromId); setSelected(null)
  }, [])

  // ── Drag-connect from handle ──
  const handleDragConnectStart = useCallback((fromId, e) => {
    e.stopPropagation()
    const rect = canvasRef.current.getBoundingClientRect()
    const toWorld = (cx, cy) => ({
      wx: (cx - rect.left - vp.x) / vp.scale - window.innerWidth / 2 / vp.scale,
      wy: (cy - rect.top - vp.y) / vp.scale - window.innerHeight / 2 / vp.scale,
    })
    const startPt = toWorld(e.clientX, e.clientY)
    setDragConnect({ fromId, ...startPt })
    setSelected(fromId)

    const cleanup = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('touchcancel', cleanup)
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', cleanup)
      setDragConnect(null)
    }

    const onMove = (ev) => {
      const clientX = ev.touches ? ev.touches[0]?.clientX : ev.clientX
      const clientY = ev.touches ? ev.touches[0]?.clientY : ev.clientY
      if (clientX == null) return
      const pt = toWorld(clientX, clientY)
      setDragConnect(dc => dc ? { ...dc, ...pt } : null)
    }

    const onUp = (ev) => {
      const clientX = ev.changedTouches ? ev.changedTouches[0]?.clientX : ev.clientX
      const clientY = ev.changedTouches ? ev.changedTouches[0]?.clientY : ev.clientY
      if (clientX != null) {
        const pt = toWorld(clientX, clientY)
        const HIT = 80
        const target = nodes.find(n =>
          n.id !== fromId &&
          Math.abs(n.x - pt.wx) < HIT &&
          Math.abs(n.y - pt.wy) < HIT
        )
        if (target) {
          const exists = edges.some(e2 =>
            (e2.from === fromId && e2.to === target.id) ||
            (e2.from === target.id && e2.to === fromId)
          )
          if (!exists) setEdges(es => [...es, { id: `e${newId()}`, from: fromId, to: target.id }])
        }
      }
      cleanup()
    }

    const onKey = (ev) => { if (ev.key === 'Escape') cleanup() }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('touchcancel', cleanup)
    window.addEventListener('keydown', onKey)
    document.addEventListener('visibilitychange', cleanup)
  }, [vp, nodes, edges])

  // ── Delete edge ──
  const deleteEdge = useCallback((edgeId) => {
    setEdges(es => es.filter(e => e.id !== edgeId))
  }, [])

  // シングルタップ → 選択のみ（ボトムシートは出さない）
  const handleNodeSelect = useCallback((id) => {
    if (connectFrom) {
      if (id !== connectFrom) {
        const exists = edges.some(e => (e.from === connectFrom && e.to === id) || (e.from === id && e.to === connectFrom))
        if (!exists) setEdges(es => [...es, { id: `e${newId()}`, from: connectFrom, to: id }])
      }
      setConnectFrom(null)
    } else {
      // 別ノードをタップしたらシートを閉じる
      if (id !== selected) setSheetOpen(false)
      setSelected(id)
    }
  }, [connectFrom, edges, selected])

  // メニューアイコンタップ → ボトムシートを開く
  const handleOpenSheet = useCallback((id) => {
    setSelected(id)
    setSheetOpen(true)
  }, [])

  // ── Export PNG ──
  const exportPng = useCallback(async () => {
    const pad = 120
    const minX = Math.min(...nodes.map(n => n.x)) - pad
    const maxX = Math.max(...nodes.map(n => n.x)) + pad
    const minY = Math.min(...nodes.map(n => n.y)) - pad
    const maxY = Math.max(...nodes.map(n => n.y)) + pad
    const W = maxX - minX, H = maxY - minY
    const canvas = document.createElement('canvas')
    canvas.width = W * 2; canvas.height = H * 2
    const ctx = canvas.getContext('2d')
    ctx.scale(2, 2)
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, W, H)
    edges.forEach(e => {
      const f = nodes.find(n => n.id === e.from), t = nodes.find(n => n.id === e.to)
      if (!f || !t) return
      const x1 = f.x - minX, y1 = f.y - minY, x2 = t.x - minX, y2 = t.y - minY
      ctx.beginPath(); ctx.moveTo(x1, y1)
      ctx.bezierCurveTo((x1+x2)/2, y1, (x1+x2)/2, y2, x2, y2)
      ctx.strokeStyle = t.provoked ? theme.provokedBorder : 'rgba(140,170,255,0.55)'
      ctx.lineWidth = 2; ctx.stroke()
    })
    nodes.forEach(n => {
      const x = n.x - minX, y = n.y - minY
      const w = n.isRoot ? 140 : 110, h = n.isRoot ? 48 : 40, r = n.isRoot ? 16 : 12
      ctx.fillStyle = n.provoked ? theme.provoked : theme.nodeBase
      ctx.strokeStyle = n.provoked ? theme.provokedBorder : theme.nodeBorder
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.roundRect(x - w/2, y - h/2, w, h, r); ctx.fill(); ctx.stroke()
      ctx.fillStyle = n.provoked ? theme.provokedText : theme.nodeText
      ctx.font = `${n.isRoot ? 700 : 500} ${n.isRoot ? 15 : 13}px system-ui`
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(n.text.length > 18 ? n.text.slice(0, 18) + '…' : n.text, x, y)
    })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `${mapName}.png`; a.click()
  }, [nodes, edges, theme, mapName])

  // ── Map management ──
  const handleLoadMap = (data) => {
    const ns = data.nodes || INITIAL_NODES
    const es = data.edges || INITIAL_EDGES
    setNodes(ns)
    setEdges(es)
    if (data.name) setMapName(data.name)
    setSelected(null)
    setTimeout(() => zoomFit(ns), 80)
  }

  const handleNewMap = () => {
    const id = genMapId()
    setMapId(id)
    setMapName('無題のマップ')
    setNodes(INITIAL_NODES)
    setEdges(INITIAL_EDGES)
    setSelected(null)
  }

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

  // ── Visibility ──
  const collapsedIds = new Set(nodes.filter(n => n.collapsed).map(n => n.id))
  const hiddenIds = new Set()
  const buildHidden = (pid) => nodes.filter(n => n.parentId === pid).forEach(n => { hiddenIds.add(n.id); buildHidden(n.id) })
  collapsedIds.forEach(id => buildHidden(id))
  const visibleNodes = nodes.filter(n => !hiddenIds.has(n.id))
  const visibleIds = new Set(visibleNodes.map(n => n.id))
  const visibleEdges = edges.filter(e => visibleIds.has(e.from) && visibleIds.has(e.to))
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]))
  const aiOn = hasApiKey()
  const selectedNodeObj = selected ? nodes.find(n => n.id === selected) : null
  const getChildCount = (id) => nodes.filter(n => n.parentId === id).length

  visibleNodes.forEach(n => { n._onToggleProvoke = () => toggleProvoke(n.id) })

  return (
    <div style={{
      width: '100vw', height: '100vh', overflow: 'hidden',
      background: theme.bg, position: 'relative',
      fontFamily: theme.font, transition: 'background 0.5s',
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pglow { 0%,100%{opacity:.5} 50%{opacity:1} }
        @keyframes pulse-ring { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeout { 0%{opacity:1} 100%{opacity:0} }
        * { box-sizing: border-box; }
        button { font-family: inherit; }
      `}</style>

      {/* Grid */}
      <div data-bg="1" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${theme.grid} 1px,transparent 1px),linear-gradient(90deg,${theme.grid} 1px,transparent 1px)`,
        backgroundSize: `${40 * vp.scale}px ${40 * vp.scale}px`,
        backgroundPosition: `${vp.x}px ${vp.y}px`,
      }} />

      {/* Canvas */}
      <div ref={canvasRef} onPointerDown={onCanvasDown} style={{ position: 'absolute', inset: 0, paddingBottom: 60 }}>
        <svg ref={svgRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'all' }}>
          <g transform={`translate(${vp.x + cx},${vp.y + cy}) scale(${vp.scale})`}>
            {visibleEdges.map(e => {
              const f = nodeMap[e.from], t = nodeMap[e.to]
              return (
                <Edge key={e.id} edgeId={e.id} from={f} to={t} theme={theme}
                  isProvoked={t?.provoked || f?.provoked}
                  onDelete={deleteEdge}
                />
              )
            })}
            {/* Draft edge while drag-connecting */}
            {dragConnect && (() => {
              const fromNode = nodeMap[dragConnect.fromId]
              if (!fromNode) return null
              return (
                <DraftEdge
                  from={fromNode}
                  to={{ x: dragConnect.wx, y: dragConnect.wy }}
                  theme={theme}
                />
              )
            })()}
          </g>
        </svg>
        <div style={{ position: 'absolute', left: vp.x + cx, top: vp.y + cy, transform: `scale(${vp.scale})`, transformOrigin: '0 0' }}>
          <AnimatePresence>
            {visibleNodes.map(n => (
              <MapNode key={n.id} node={n} theme={theme}
                isSelected={selected === n.id}
                isConnectTarget={!!connectFrom && connectFrom !== n.id}
                onSelect={handleNodeSelect}
                onOpenSheet={handleOpenSheet}
                onMove={updatePos}
                onDragConnectStart={handleDragConnectStart}
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
        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            border: `1px solid ${theme.nodeAccent}55`,
            background: `radial-gradient(circle,${theme.nodeAccent}33,transparent)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'pglow 3s ease-in-out infinite', flexShrink: 0,
          }}>
            <GitBranch size={13} color={theme.nodeAccent} />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: theme.nodeText, letterSpacing: '0.06em' }}>RESONANCE MAP</div>
            <div style={{ fontSize: 9, color: theme.nodeAccent, letterSpacing: '0.15em', fontFamily: 'monospace' }}>
              {mode === 'business' ? 'BUSINESS OS' : 'PHILOSOPHY OS'}
            </div>
          </div>
          <MapManagerBtn theme={theme} onOpen={() => setShowMapManager(true)} mapName={mapName} />
          <ApiKeyBadge theme={theme} onOpen={() => setShowKeyModal(true)} />
        </div>

        <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: theme.nodeText, opacity: 0.4, fontFamily: 'monospace' }}>BIZ</span>
          <motion.div onClick={() => setMode(m => m === 'business' ? 'philosophy' : 'business')}
            style={{ width: 44, height: 24, borderRadius: 12, background: theme.toggleBg, border: `1px solid ${theme.nodeBorder}`, cursor: 'pointer', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <motion.div animate={{ x: mode === 'business' ? 2 : 22 }} transition={{ type: 'spring', stiffness: 500, damping: 35 }}
              style={{ width: 18, height: 18, borderRadius: '50%', background: theme.nodeAccent, boxShadow: `0 0 8px ${theme.nodeAccent}88` }} />
          </motion.div>
          <span style={{ fontSize: 10, color: theme.nodeText, opacity: 0.4, fontFamily: 'monospace' }}>PHI</span>
        </div>
      </div>

      {/* ── Bottom toolbar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center',
        padding: '8px 12px 12px',
        background: `linear-gradient(0deg, ${theme.bg} 0%, transparent 100%)`,
        pointerEvents: 'none',
        zIndex: 100,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: mode === 'business' ? 'rgba(4,10,24,0.95)' : 'rgba(16,13,8,0.97)',
          border: `1px solid ${theme.nodeBorder}`, borderRadius: 14, padding: '7px 10px',
          backdropFilter: 'blur(16px)', boxShadow: theme.shadow,
          overflowX: 'auto', maxWidth: '100%',
          pointerEvents: 'auto',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
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
        <ToolbarBtn onClick={() => zoomFit()} theme={theme} title="ビューをフィット">
          <LayoutGrid size={14} />
        </ToolbarBtn>
        <div style={{ width: 1, height: 20, background: theme.nodeBorder }} />
        <ToolbarBtn onClick={() => {
          try {
            localStorage.setItem('resonance-map:3d-transfer', JSON.stringify({ nodes, edges, name: mapName }))
          } catch {}
          window.open('./3d/', '_blank')
        }} theme={theme} title="3Dで見る">
          <span>◈ 3D</span>
        </ToolbarBtn>
        </div>
      </div>

      {/* Auto save indicator */}
      {autoSaveFlash && (
        <div style={{
          position: 'fixed', bottom: 60, right: 16,
          fontSize: 10, color: theme.nodeAccent, fontFamily: 'monospace',
          opacity: 0, animation: 'fadeout 1s ease forwards',
          pointerEvents: 'none',
        }}>
          ✓ 自動保存
        </div>
      )}

      <div style={{
        position: 'absolute', top: 68, left: 20,
        fontSize: 10, color: theme.nodeText, opacity: 0.2,
        fontFamily: 'monospace', letterSpacing: '0.08em', lineHeight: 1.9, pointerEvents: 'none',
      }}>
        <div>TAP → 選択</div>
        <div>● アイコン → メニュー</div>
        <div>ドラッグ → 移動／パン</div>
        <div>ハンドル → 接続</div>
        <div>エッジタップ → 削除</div>
      </div>

      {/* Mode flash */}
      <AnimatePresence>
        <motion.div key={mode} initial={{ opacity: 0.2 }} animate={{ opacity: 0 }} transition={{ duration: 0.9 }}
          style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: mode === 'business'
              ? 'radial-gradient(ellipse at 50% 40%,rgba(0,120,255,0.18),transparent 65%)'
              : 'radial-gradient(ellipse at 50% 40%,rgba(180,150,80,0.14),transparent 65%)',
          }} />
      </AnimatePresence>

      {/* Connect banner */}
      <AnimatePresence>
        {connectFrom && (
          <ConnectBanner fromNode={nodes.find(n => n.id === connectFrom)} theme={theme} onCancel={() => setConnectFrom(null)} />
        )}
      </AnimatePresence>

      {/* Bottom Sheet - ダブルタップで開く */}
      {selected && sheetOpen && !noteTarget && !editTextTarget && (
        <BottomSheet
          node={selectedNodeObj} theme={theme} aiOn={aiOn}
          isLoading={provokeLoading} isDualLoading={dualLoading}
          isAutoExpanding={autoExpanding}
          childCount={getChildCount(selected)}
          onClose={() => { setSheetOpen(false); setSelected(null) }}
          onProvoke={provoke} onDualProvoke={dualProvoke}
          onAutoExpand={handleAutoExpand}
          onDelete={deleteNode} onToggleChildren={toggleChildren}
          onToggleProvoke={toggleProvoke}
          onEditNote={(id) => setNoteTarget(id)}
          onEditText={(id) => setEditTextTarget(id)}
          onChangeColor={changeColor}
          onStartConnect={startConnect}
          onExportPng={exportPng}
        />
      )}

      {/* Note Modal */}
      {noteTarget && (
        <NoteModal node={nodes.find(n => n.id === noteTarget)} theme={theme}
          onSave={updateNote} onClose={() => setNoteTarget(null)} />
      )}

      {/* Edit Text Modal */}
      {editTextTarget && (
        <EditTextModal node={nodes.find(n => n.id === editTextTarget)} theme={theme}
          onSave={updateText} onClose={() => setEditTextTarget(null)} />
      )}

      {/* Map Manager */}
      {showMapManager && (
        <MapManagerModal
          theme={theme}
          currentMapId={mapId} currentName={mapName}
          nodes={nodes} edges={edges}
          onLoad={handleLoadMap} onNew={handleNewMap}
          onClose={() => setShowMapManager(false)}
        />
      )}

      {/* Auto Expand Overlay */}
      {autoExpanding && (
        <AutoExpandOverlay
          theme={theme}
          progress={expandProgress.done}
          total={expandProgress.total}
          nodeTexts={expandProgress.texts}
        />
      )}

      {/* API Key Modal */}
      {showKeyModal && (
        <ApiKeyModal theme={theme} onClose={() => { setShowKeyModal(false); forceUpdate(n => n + 1) }} />
      )}
    </div>
  )
}
