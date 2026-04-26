import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Trash2, StickyNote, ChevronDown, ChevronUp } from 'lucide-react'

export function BottomSheet({ node, theme, aiOn, onClose, onProvoke, onDelete, onToggleChildren, onToggleProvoke, onEditNote, childCount, isLoading }) {
  if (!node) return null

  const hasProvoke = node.provoked && node.provokeData
  const childrenCollapsed = node.collapsed

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.3)',
        }}
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 400, damping: 40 }}
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          zIndex: 201,
          background: theme.bg === '#04080f' ? '#0a1020' : '#181410',
          border: `1px solid ${theme.nodeBorder}`,
          borderRadius: '20px 20px 0 0',
          padding: '0 0 32px',
          boxShadow: `0 -8px 40px rgba(0,0,0,0.5)`,
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: theme.nodeBorder }} />
        </div>

        {/* Node title */}
        <div style={{ padding: '8px 20px 16px', borderBottom: `1px solid ${theme.nodeBorder}` }}>
          <div style={{ fontSize: 11, color: theme.nodeAccent, fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 4 }}>
            {node.isRoot ? 'ROOT NODE' : 'NODE'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: theme.nodeText, lineHeight: 1.3 }}>
            {node.text}
          </div>
          {/* Note preview */}
          {node.note && (
            <div style={{ marginTop: 6, fontSize: 12, color: theme.nodeText, opacity: 0.55, lineHeight: 1.4, fontStyle: 'italic' }}>
              {node.note.length > 60 ? node.note.slice(0, 60) + '…' : node.note}
            </div>
          )}
        </div>

        {/* Actions grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '16px 16px 8px' }}>
          {/* Provoke */}
          <SheetBtn
            onClick={() => { onProvoke(node.id, node.text); onClose() }}
            theme={theme}
            accent={theme.nodeAccent}
            disabled={isLoading}
            icon={<Zap size={16} />}
            label={isLoading ? '生成中…' : 'PROVOKE'}
            sub={aiOn ? 'AI生成' : 'Stoicモード'}
          />

          {/* Note */}
          <SheetBtn
            onClick={() => { onEditNote(node.id); onClose() }}
            theme={theme}
            accent={theme.nodeAccent}
            icon={<StickyNote size={16} />}
            label='メモ'
            sub={node.note ? '編集する' : '追加する'}
          />

          {/* Toggle children */}
          {childCount > 0 && (
            <SheetBtn
              onClick={() => { onToggleChildren(node.id); onClose() }}
              theme={theme}
              accent={theme.nodeAccent}
              icon={childrenCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              label={childrenCollapsed ? '子を展開' : '子を折りたたむ'}
              sub={`${childCount}件`}
            />
          )}

          {/* Toggle provoke */}
          {hasProvoke && (
            <SheetBtn
              onClick={() => { onToggleProvoke(node.id); onClose() }}
              theme={theme}
              accent={theme.provokedBorder}
              icon={node.provokeCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
              label={node.provokeCollapsed ? '問いを展開' : '問いを折りたたむ'}
              sub='PROVOCATION'
            />
          )}

          {/* Delete */}
          {!node.isRoot && (
            <SheetBtn
              onClick={() => { onDelete(node.id); onClose() }}
              theme={theme}
              accent='rgba(255,80,80,0.8)'
              icon={<Trash2 size={16} />}
              label='削除'
              sub='このノードを消す'
              danger
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function SheetBtn({ onClick, theme, accent, icon, label, sub, disabled, danger }) {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: 0.96 }}
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
