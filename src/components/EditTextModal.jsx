import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'

export function EditTextModal({ node, theme, onSave, onClose }) {
  const [draft, setDraft] = useState(node?.text || '')
  const inputRef = useRef(null)

  useEffect(() => {
    setDraft(node?.text || '')
    setTimeout(() => { inputRef.current?.focus(); inputRef.current?.select() }, 80)
  }, [node])

  if (!node) return null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 560,
          background: theme.bg === '#04080f' ? '#0a1020' : '#181410',
          border: `1px solid ${theme.nodeBorder}`,
          borderRadius: '20px 20px 0 0',
          padding: '20px 20px 36px',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: theme.nodeAccent, fontFamily: 'monospace', letterSpacing: '0.12em' }}>
            EDIT NODE TEXT
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.nodeText, opacity: 0.4, cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { onSave(node.id, draft.trim() || node.text); onClose() } if (e.key === 'Escape') onClose() }}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.07)',
            border: `1px solid ${theme.nodeAccent}55`,
            borderRadius: 10, padding: '12px 14px',
            color: theme.nodeText, fontSize: 16, fontFamily: 'inherit',
            outline: 'none',
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
          <motion.button whileTap={{ scale: 0.96 }} onClick={onClose}
            style={{ background: 'transparent', border: `1px solid ${theme.nodeBorder}`, borderRadius: 10, padding: '10px 16px', color: theme.nodeText, opacity: 0.6, fontSize: 13, cursor: 'pointer' }}>
            キャンセル
          </motion.button>
          <motion.button whileTap={{ scale: 0.96 }}
            onClick={() => { onSave(node.id, draft.trim() || node.text); onClose() }}
            style={{ background: `${theme.nodeAccent}22`, border: `1px solid ${theme.nodeAccent}66`, borderRadius: 10, padding: '10px 20px', color: theme.nodeAccent, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace' }}>
            保存
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}
