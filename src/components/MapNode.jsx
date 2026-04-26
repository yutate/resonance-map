import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, StickyNote, ChevronDown } from 'lucide-react'

export function MapNode({ node, theme, isSelected, onSelect, onMove, scale, childCount, allCollapsed }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(node.text)
  const inputRef = useRef(null)
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 })

  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])
  useEffect(() => { setDraft(node.text) }, [node.text])

  const onPointerDown = (e) => {
    if (editing) return
    e.stopPropagation()
    drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y }

    const move = (ev) => {
      if (!drag.current.active) return
      const dx = (ev.clientX - drag.current.sx) / scale
      const dy = (ev.clientY - drag.current.sy) / scale
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) drag.current.moved = true
      if (drag.current.moved) onMove(node.id, drag.current.ox + dx, drag.current.oy + dy)
    }
    const up = () => {
      drag.current.active = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      // タップ判定: 動いていなければ選択
      if (!drag.current.moved) onSelect(node.id)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  const commitEdit = () => {
    setEditing(false)
    // onTextChangeはApp側でnode updateする
    // ここではdraftをpropsに反映するためにonSelectを経由せずApp側に委ねる
  }

  const ip = node.provoked && node.provokeData
  const provokeCollapsed = node.provokeCollapsed
  const border = ip ? theme.provokedBorder : isSelected ? theme.nodeAccent : theme.nodeBorder
  const shadow = ip ? theme.provokedShadow : isSelected ? theme.shadow : 'none'

  return (
    <motion.div
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.4, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 28 }}
      onPointerDown={onPointerDown}
      onDoubleClick={e => { e.stopPropagation(); setEditing(true) }}
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
        borderRadius: node.isRoot ? 16 : 12,
        boxShadow: shadow,
        padding: node.isRoot ? '14px 22px' : '11px 16px',
        minWidth: node.isRoot ? 140 : 110,
        maxWidth: 240,
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
            onBlur={() => { setEditing(false); node._onTextCommit?.(draft.trim() || node.text) }}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === 'Escape') { setEditing(false) }
              e.stopPropagation()
            }}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: theme.nodeText,
              fontSize: node.isRoot ? 16 : 14,
              fontWeight: node.isRoot ? 700 : 500,
              fontFamily: 'inherit', width: '100%', minWidth: 80,
            }}
          />
        ) : (
          <div style={{
            color: ip ? theme.provokedText : theme.nodeText,
            fontSize: node.isRoot ? 16 : 14,
            fontWeight: node.isRoot ? 700 : 500,
            lineHeight: 1.4, wordBreak: 'break-word',
          }}>{node.text}</div>
        )}

        {/* Note indicator */}
        {node.note && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
            <StickyNote size={9} color={theme.nodeAccent} opacity={0.6} />
            <span style={{ fontSize: 10, color: theme.nodeAccent, opacity: 0.6, fontFamily: 'monospace' }}>MEMO</span>
          </div>
        )}

        {/* Provocation (collapsible) */}
        {ip && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ marginTop: 8 }}
          >
            {/* Provoke header (always visible) */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 8px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: provokeCollapsed ? 6 : '6px 6px 0 0',
              borderLeft: `2px solid ${theme.provokedBorder}`,
              cursor: 'pointer',
            }}
              onClick={e => { e.stopPropagation(); node._onToggleProvoke?.() }}
            >
              <span style={{ fontSize: 9, color: theme.provokedBorder, letterSpacing: '0.12em', fontWeight: 700, fontFamily: 'monospace' }}>
                PROVOCATION
              </span>
              <ChevronDown size={10} color={theme.provokedBorder}
                style={{ transform: provokeCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>

            {/* Provoke body */}
            <AnimatePresence>
              {!provokeCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    padding: '6px 8px 6px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '0 0 6px 6px',
                    borderLeft: `2px solid ${theme.provokedBorder}`,
                  }}>
                    <div style={{ fontSize: 12, color: theme.provokedText, lineHeight: 1.5 }}>
                      {node.provokeData.text}
                    </div>
                    {/* Note reply */}
                    {node.note && (
                      <div style={{
                        marginTop: 6, paddingTop: 6,
                        borderTop: `1px solid ${theme.nodeBorder}`,
                        fontSize: 11, color: theme.nodeText, opacity: 0.7, lineHeight: 1.45,
                        fontStyle: 'italic',
                      }}>
                        {node.note}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Collapsed children badge */}
        {node.collapsed && childCount > 0 && (
          <div style={{
            marginTop: 7, display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px',
            background: `${theme.nodeAccent}18`,
            borderRadius: 5,
            border: `1px solid ${theme.nodeAccent}33`,
          }}>
            <ChevronRight size={9} color={theme.nodeAccent} />
            <span style={{ fontSize: 10, color: theme.nodeAccent, fontFamily: 'monospace' }}>
              {childCount} nodes
            </span>
          </div>
        )}

        {/* Selected indicator dot */}
        {isSelected && (
          <div style={{
            position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
            width: 6, height: 6, borderRadius: '50%',
            background: theme.nodeAccent,
            boxShadow: `0 0 6px ${theme.nodeAccent}`,
          }} />
        )}
      </div>
    </motion.div>
  )
}
