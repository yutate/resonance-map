import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Zap, X, Loader } from 'lucide-react'

export function MapNode({ node, theme, isSelected, onSelect, onMove, onProvoke, onDelete, onTextChange, scale }) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [draft, setDraft] = useState(node.text)
  const inputRef = useRef(null)
  const drag = useRef({ active: false, sx: 0, sy: 0, ox: 0, oy: 0 })

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setDraft(node.text) }, [node.text])

  const onPointerDown = (e) => {
    if (editing) return
    e.stopPropagation()
    onSelect(node.id)
    drag.current = { active: true, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y }
    const move = (ev) => {
      if (!drag.current.active) return
      onMove(node.id,
        drag.current.ox + (ev.clientX - drag.current.sx) / scale,
        drag.current.oy + (ev.clientY - drag.current.sy) / scale
      )
    }
    const up = () => {
      drag.current.active = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const handleProvoke = async (e) => {
    e.stopPropagation()
    setError(null)
    setLoading(true)
    try {
      await onProvoke(node.id, node.text)
    } catch (err) {
      setError(err.message)
      setTimeout(() => setError(null), 4000)
    } finally {
      setLoading(false)
    }
  }

  const commitEdit = () => {
    setEditing(false)
    onTextChange(node.id, draft.trim() || node.text)
  }

  const ip = node.provoked && node.provokeData
  const border = ip ? theme.provokedBorder : isSelected ? theme.nodeAccent : theme.nodeBorder
  const shadow = ip ? theme.provokedShadow : isSelected ? theme.shadow : 'none'

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.4, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      onPointerDown={onPointerDown}
      style={{
        position: 'absolute', left: node.x, top: node.y,
        transform: 'translate(-50%,-50%)',
        cursor: editing ? 'text' : 'grab',
        zIndex: isSelected ? 10 : 1,
        userSelect: 'none',
      }}
    >
      <div style={{
        background: ip ? theme.provoked : theme.nodeBase,
        border: `1.5px solid ${border}`,
        borderRadius: node.isRoot ? 14 : 10,
        boxShadow: shadow,
        padding: node.isRoot ? '12px 20px' : '9px 14px',
        minWidth: node.isRoot ? 130 : 100,
        maxWidth: 220,
        position: 'relative',
        transition: 'all 0.25s',
      }}>
        {/* ROOT badge */}
        {node.isRoot && (
          <div style={{
            position: 'absolute', top: -1, left: 14,
            fontSize: 9, letterSpacing: '0.15em', fontWeight: 700,
            color: theme.nodeAccent, background: theme.bg,
            padding: '0 5px', transform: 'translateY(-50%)',
            fontFamily: 'monospace',
          }}>ROOT</div>
        )}

        {/* Text / Edit */}
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') commitEdit()
              e.stopPropagation()
            }}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: theme.nodeText,
              fontSize: node.isRoot ? 15 : 13,
              fontWeight: node.isRoot ? 700 : 500,
              fontFamily: 'inherit', width: '100%', minWidth: 80,
            }}
          />
        ) : (
          <div
            onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
            style={{
              color: ip ? theme.provokedText : theme.nodeText,
              fontSize: node.isRoot ? 15 : 13,
              fontWeight: node.isRoot ? 700 : 500,
              lineHeight: 1.4, wordBreak: 'break-word',
            }}
          >{node.text}</div>
        )}

        {/* Provocation display */}
        {ip && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: 8, padding: '5px 8px',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 6,
              borderLeft: `2px solid ${theme.provokedBorder}`,
            }}
          >
            <div style={{
              fontSize: 9, color: theme.provokedBorder, letterSpacing: '0.12em',
              fontWeight: 700, marginBottom: 3, fontFamily: 'monospace',
            }}>PROVOCATION</div>
            <div style={{ fontSize: 11, color: theme.provokedText, lineHeight: 1.45 }}>
              {node.provokeData.text}
            </div>
          </motion.div>
        )}

        {/* Error */}
        {error && (
          <div style={{
            marginTop: 6, fontSize: 10, color: '#ff6b6b',
            lineHeight: 1.4, wordBreak: 'break-word',
          }}>{error}</div>
        )}

        {/* Controls */}
        <div style={{ display: 'flex', gap: 4, marginTop: 7, justifyContent: 'flex-end' }}>
          <motion.button
            whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
            onClick={handleProvoke} disabled={loading}
            title="AIに揺さぶってもらう"
            style={{
              background: `linear-gradient(135deg, ${theme.nodeAccent}18, ${theme.nodeAccent}35)`,
              border: `1px solid ${theme.nodeAccent}55`,
              borderRadius: 6, padding: '3px 8px',
              color: theme.nodeAccent, fontSize: 10, fontWeight: 700,
              letterSpacing: '0.08em',
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center', gap: 3,
              fontFamily: 'monospace',
            }}
          >
            {loading
              ? <Loader size={9} style={{ animation: 'spin 1s linear infinite' }} />
              : <Zap size={9} />
            }
            {loading ? '…' : 'PROVOKE'}
          </motion.button>

          {!node.isRoot && (
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={e => { e.stopPropagation(); onDelete(node.id) }}
              title="ノードを削除"
              style={{
                background: 'transparent',
                border: '1px solid rgba(255,80,80,0.2)',
                borderRadius: 6, padding: '3px 5px',
                color: 'rgba(255,100,100,0.55)',
                cursor: 'pointer', display: 'flex', alignItems: 'center',
              }}
            >
              <X size={9} />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  )
}
