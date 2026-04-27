import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, StickyNote, ChevronDown } from 'lucide-react'

const COLOR_MAP = {
  c0: { bg: 'rgba(124,111,255,0.18)', border: 'rgba(124,111,255,0.5)', text: '#cac4ff' },
  c1: { bg: 'rgba(255,107,157,0.15)', border: 'rgba(255,107,157,0.5)', text: '#ffb3ce' },
  c2: { bg: 'rgba(107,255,203,0.13)', border: 'rgba(107,255,203,0.45)', text: '#9affd8' },
  c3: { bg: 'rgba(255,187,107,0.15)', border: 'rgba(255,187,107,0.5)', text: '#ffda9a' },
  c4: { bg: 'rgba(107,184,255,0.15)', border: 'rgba(107,184,255,0.5)', text: '#a8d8ff' },
  c5: { bg: 'rgba(200,180,255,0.12)', border: 'rgba(200,180,255,0.4)', text: '#d8ccff' },
}

export function MapNode({
  node, theme, isSelected, isConnectTarget,
  onSelect, onOpenSheet, onMove, onDragConnectStart,
  scale, childCount,
}) {
  const drag = useRef({ active: false, moved: false, sx: 0, sy: 0, ox: 0, oy: 0 })

  // ── Main node pointer: drag = move, tap = select + show handle/icon ──
  const onPointerDown = (e) => {
    e.stopPropagation()
    drag.current = { active: true, moved: false, sx: e.clientX, sy: e.clientY, ox: node.x, oy: node.y }
    const move = (ev) => {
      if (!drag.current.active) return
      const dx = (ev.clientX - drag.current.sx) / scale
      const dy = (ev.clientY - drag.current.sy) / scale
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.current.moved = true
      if (drag.current.moved) onMove(node.id, drag.current.ox + dx, drag.current.oy + dy)
    }
    const up = () => {
      drag.current.active = false
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      if (!drag.current.moved) onSelect(node.id)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // ── Handle drag (connect) ──
  const onHandlePointerDown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    onDragConnectStart(node.id, e)
  }

  const ip = node.provoked && node.provokeData
  const colorStyle = node.colorKey ? COLOR_MAP[node.colorKey] : null
  const nodeBg = ip ? theme.provoked : (colorStyle ? colorStyle.bg : theme.nodeBase)
  const nodeBorder = isConnectTarget
    ? '#00ff88'
    : ip ? theme.provokedBorder
    : isSelected ? theme.nodeAccent
    : (colorStyle ? colorStyle.border : theme.nodeBorder)
  const nodeText = ip ? theme.provokedText : (colorStyle ? colorStyle.text : theme.nodeText)
  const shadow = isConnectTarget
    ? '0 0 0 3px rgba(0,255,136,0.3), 0 8px 30px rgba(0,0,0,0.4)'
    : ip ? theme.provokedShadow
    : isSelected ? theme.shadow : 'none'

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
        cursor: 'grab', zIndex: isSelected ? 10 : 1, userSelect: 'none',
      }}
    >
      <div style={{
        background: nodeBg,
        border: `1.5px solid ${nodeBorder}`,
        borderRadius: node.isRoot ? 16 : 12,
        boxShadow: shadow,
        padding: node.isRoot ? '14px 22px' : '11px 16px',
        minWidth: node.isRoot ? 140 : 110, maxWidth: 240,
        position: 'relative', transition: 'all 0.2s',
      }}>
        {node.isRoot && (
          <div style={{
            position: 'absolute', top: -1, left: 14,
            fontSize: 9, letterSpacing: '0.15em', fontWeight: 700,
            color: theme.nodeAccent, background: theme.bg,
            padding: '0 5px', transform: 'translateY(-50%)', fontFamily: 'monospace',
          }}>ROOT</div>
        )}

        <div style={{
          color: nodeText, fontSize: node.isRoot ? 16 : 14,
          fontWeight: node.isRoot ? 700 : 500, lineHeight: 1.4, wordBreak: 'break-word',
        }}>{node.text}</div>

        {node.note && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 5 }}>
            <StickyNote size={9} color={theme.nodeAccent} opacity={0.6} />
            <span style={{ fontSize: 10, color: theme.nodeAccent, opacity: 0.6, fontFamily: 'monospace' }}>MEMO</span>
          </div>
        )}

        {ip && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} style={{ marginTop: 8 }}>
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '4px 8px',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: node.provokeCollapsed ? 6 : '6px 6px 0 0',
                borderLeft: `2px solid ${theme.provokedBorder}`, cursor: 'pointer',
              }}
              onClick={e => { e.stopPropagation(); node._onToggleProvoke?.() }}
            >
              <span style={{ fontSize: 9, color: theme.provokedBorder, letterSpacing: '0.12em', fontWeight: 700, fontFamily: 'monospace' }}>
                {node.provokeData?.mode === 'dual' ? 'DUAL PROVOCATION' : 'PROVOCATION'}
              </span>
              <ChevronDown size={10} color={theme.provokedBorder}
                style={{ transform: node.provokeCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
            </div>
            <AnimatePresence>
              {!node.provokeCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{
                    padding: '6px 8px', background: 'rgba(255,255,255,0.03)',
                    borderRadius: '0 0 6px 6px', borderLeft: `2px solid ${theme.provokedBorder}`,
                  }}>
                    {node.provokeData?.mode === 'dual' ? (
                      <>
                        <div style={{ fontSize: 9, color: '#0078ff', fontFamily: 'monospace', fontWeight: 700, marginBottom: 3 }}>BUSINESS</div>
                        <div style={{ fontSize: 12, color: '#00e5ff', lineHeight: 1.45, marginBottom: 8 }}>{node.provokeData.business?.text}</div>
                        <div style={{ fontSize: 9, color: '#c8a96e', fontFamily: 'monospace', fontWeight: 700, marginBottom: 3 }}>PHILOSOPHY</div>
                        <div style={{ fontSize: 12, color: '#f0d890', lineHeight: 1.45 }}>{node.provokeData.philosophy?.text}</div>
                      </>
                    ) : (
                      <div style={{ fontSize: 12, color: theme.provokedText, lineHeight: 1.5 }}>{node.provokeData.text}</div>
                    )}
                    {node.note && (
                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${theme.nodeBorder}`, fontSize: 11, color: theme.nodeText, opacity: 0.7, lineHeight: 1.45, fontStyle: 'italic' }}>
                        {node.note}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {node.collapsed && childCount > 0 && (
          <div style={{
            marginTop: 7, display: 'flex', alignItems: 'center', gap: 4,
            padding: '3px 8px', background: `${theme.nodeAccent}18`,
            borderRadius: 5, border: `1px solid ${theme.nodeAccent}33`,
          }}>
            <ChevronRight size={9} color={theme.nodeAccent} />
            <span style={{ fontSize: 10, color: theme.nodeAccent, fontFamily: 'monospace' }}>{childCount} nodes</span>
          </div>
        )}

        {/* Selected dot */}
        {isSelected && !isConnectTarget && (
          <div style={{
            position: 'absolute', bottom: -5, left: '50%', transform: 'translateX(-50%)',
            width: 6, height: 6, borderRadius: '50%',
            background: theme.nodeAccent, boxShadow: `0 0 6px ${theme.nodeAccent}`,
          }} />
        )}

        {/* Connect target ring */}
        {isConnectTarget && (
          <div style={{
            position: 'absolute', inset: -4, borderRadius: node.isRoot ? 20 : 16,
            border: '2px solid #00ff88',
            animation: 'pulse-ring 1s ease-in-out infinite',
            pointerEvents: 'none',
          }} />
        )}
      </div>

      {/* ── Menu icon (tap to open sheet) ── */}
      {isSelected && (
        <div
          onPointerDown={e => { e.stopPropagation(); onOpenSheet(node.id) }}
          style={{
            position: 'absolute',
            top: -14, left: '50%', transform: 'translateX(-50%)',
            width: 26, height: 26, borderRadius: '50%',
            background: theme.nodeAccent,
            border: `2px solid ${theme.bg}`,
            boxShadow: `0 0 10px ${theme.nodeAccent}99`,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20,
            touchAction: 'none',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2.5, alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: theme.bg }} />
            ))}
          </div>
        </div>
      )}

      {/* ── Drag-connect handle ── */}
      {isSelected && (
        <div
          onPointerDown={onHandlePointerDown}
          style={{
            position: 'absolute',
            right: -14, top: '50%', transform: 'translateY(-50%)',
            width: 20, height: 20, borderRadius: '50%',
            background: theme.nodeAccent,
            border: `2px solid ${theme.bg}`,
            boxShadow: `0 0 8px ${theme.nodeAccent}99`,
            cursor: 'crosshair',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 20,
            touchAction: 'none',
          }}
        >
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: theme.bg }} />
        </div>
      )}
    </motion.div>
  )
}
