import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, Trash2, StickyNote, ChevronDown, ChevronUp, Link, Download, Pencil, Zap as ZapDual } from 'lucide-react'
import { AutoExpandBtn } from './AutoExpand.jsx'

const NODE_COLORS = [
  { key: 'c0', label: 'Purple', hex: '#7c6fff' },
  { key: 'c1', label: 'Pink',   hex: '#ff6b9d' },
  { key: 'c2', label: 'Mint',   hex: '#6bffcb' },
  { key: 'c3', label: 'Amber',  hex: '#ffbb6b' },
  { key: 'c4', label: 'Blue',   hex: '#6bb8ff' },
  { key: 'c5', label: 'Lavender', hex: '#c8b4ff' },
]

export function BottomSheet({
  node, theme, aiOn, onClose,
  onProvoke, onDualProvoke, onDelete,
  onToggleChildren, onToggleProvoke,
  onEditNote, onEditText, onChangeColor,
  onStartConnect, onExportPng, onAutoExpand,
  childCount, isLoading, isDualLoading, isAutoExpanding,
}) {
  const [showColors, setShowColors] = useState(false)
  if (!node) return null

  const hasProvoke = node.provoked && node.provokeData
  const childrenCollapsed = node.collapsed

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.35)' }}
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 201,
          background: theme.bg === '#04080f' ? '#0a1020' : '#181410',
          border: `1px solid ${theme.nodeBorder}`,
          borderRadius: '20px 20px 0 0',
          padding: '0 0 36px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
          maxHeight: '85vh', overflowY: 'auto',
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.nodeBorder }} />
        </div>

        {/* Node title */}
        <div style={{ padding: '8px 20px 14px', borderBottom: `1px solid ${theme.nodeBorder}` }}>
          <div style={{ fontSize: 11, color: theme.nodeAccent, fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 4 }}>
            {node.isRoot ? 'ROOT NODE' : 'NODE'}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: theme.nodeText, lineHeight: 1.3, flex: 1 }}>
              {node.text}
            </div>
            {/* Color dot */}
            <div
              onClick={() => setShowColors(v => !v)}
              style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0, marginTop: 2,
                background: NODE_COLORS.find(c => c.key === (node.colorKey || 'c0'))?.hex || '#7c6fff',
                border: `2px solid rgba(255,255,255,0.2)`, cursor: 'pointer',
              }}
            />
          </div>
          {node.note && (
            <div style={{ marginTop: 6, fontSize: 12, color: theme.nodeText, opacity: 0.5, lineHeight: 1.4, fontStyle: 'italic' }}>
              {node.note.length > 60 ? node.note.slice(0, 60) + '…' : node.note}
            </div>
          )}

          {/* Color picker */}
          <AnimatePresence>
            {showColors && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ display: 'flex', gap: 10, marginTop: 12, paddingTop: 10, borderTop: `1px solid ${theme.nodeBorder}` }}>
                  {NODE_COLORS.map(c => (
                    <div key={c.key}
                      onClick={() => { onChangeColor(node.id, c.key); setShowColors(false); onClose() }}
                      style={{
                        width: 28, height: 28, borderRadius: '50%', background: c.hex,
                        border: `2px solid ${node.colorKey === c.key ? 'white' : 'transparent'}`,
                        cursor: 'pointer', flexShrink: 0,
                        boxShadow: node.colorKey === c.key ? `0 0 8px ${c.hex}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Actions grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '14px 16px 0' }}>

          {/* Auto Expand - full width */}
          <AutoExpandBtn
            onClick={() => { onAutoExpand(node.id, node.text); onClose() }}
            theme={theme}
            loading={isAutoExpanding}
          />

          {/* Edit text */}
          <SheetBtn onClick={() => { onEditText(node.id); onClose() }} theme={theme} accent={theme.nodeAccent}
            icon={<Pencil size={15} />} label='テキスト編集' sub='ノード名を変更' />

          {/* Note */}
          <SheetBtn onClick={() => { onEditNote(node.id); onClose() }} theme={theme} accent={theme.nodeAccent}
            icon={<StickyNote size={15} />} label='メモ' sub={node.note ? '編集する' : '追加する'} />

          {/* Provoke */}
          <SheetBtn onClick={() => { onProvoke(node.id, node.text); onClose() }} theme={theme}
            accent={theme.nodeAccent} disabled={isLoading || isDualLoading}
            icon={<Zap size={15} />} label={isLoading ? '生成中…' : 'PROVOKE'}
            sub={aiOn ? 'AI生成' : 'Stoicモード'} />

          {/* Dual Provoke */}
          <SheetBtn onClick={() => { onDualProvoke(node.id, node.text); onClose() }} theme={theme}
            accent={theme.provokedBorder} disabled={isLoading || isDualLoading}
            icon={<ZapDual size={15} />} label={isDualLoading ? '生成中…' : 'DUAL'}
            sub='Business + Philosophy' />

          {/* Connect */}
          <SheetBtn onClick={() => { onStartConnect(node.id); onClose() }} theme={theme} accent={theme.nodeAccent}
            icon={<Link size={15} />} label='接続' sub='別のノードへ繋ぐ' />

          {/* Export PNG */}
          <SheetBtn onClick={() => { onExportPng(); onClose() }} theme={theme} accent={theme.nodeAccent}
            icon={<Download size={15} />} label='PNG保存' sub='マップを画像で' />

          {/* Toggle children */}
          {childCount > 0 && (
            <SheetBtn onClick={() => { onToggleChildren(node.id); onClose() }} theme={theme} accent={theme.nodeAccent}
              icon={childrenCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              label={childrenCollapsed ? '子を展開' : '子を折りたたむ'} sub={`${childCount}件`} />
          )}

          {/* Toggle provoke */}
          {hasProvoke && (
            <SheetBtn onClick={() => { onToggleProvoke(node.id); onClose() }} theme={theme} accent={theme.provokedBorder}
              icon={node.provokeCollapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
              label={node.provokeCollapsed ? '問いを展開' : '問いを折りたたむ'} sub='PROVOCATION' />
          )}

          {/* Delete */}
          {!node.isRoot && (
            <SheetBtn onClick={() => { onDelete(node.id); onClose() }} theme={theme}
              accent='rgba(255,80,80,0.8)' danger
              icon={<Trash2 size={15} />} label='削除' sub='このノードを消す' />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function SheetBtn({ onClick, theme, accent, icon, label, sub, disabled, danger }) {
  return (
    <motion.button onClick={onClick} disabled={disabled} whileTap={{ scale: 0.95 }}
      style={{
        background: danger ? 'rgba(255,60,60,0.08)' : `${accent}11`,
        border: `1px solid ${danger ? 'rgba(255,80,80,0.2)' : accent + '33'}`,
        borderRadius: 12, padding: '12px 14px',
        color: danger ? 'rgba(255,100,100,0.8)' : accent,
        cursor: disabled ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left', opacity: disabled ? 0.6 : 1,
        transition: 'all 0.15s',
      }}
    >
      <div style={{ flexShrink: 0 }}>{icon}</div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.06em' }}>{label}</div>
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>{sub}</div>
      </div>
    </motion.button>
  )
}
