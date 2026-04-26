import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function NoteModal({ node, theme, onSave, onClose }) {
  const [draft, setDraft] = useState(node?.note || '')
  const textareaRef = useRef(null)

  useEffect(() => {
    setDraft(node?.note || '')
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [node])

  if (!node) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
      >
        <motion.div
          initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 10, color: theme.nodeAccent, fontFamily: 'monospace', letterSpacing: '0.12em', marginBottom: 2 }}>NOTE</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: theme.nodeText }}>{node.text}</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: theme.nodeText, opacity: 0.4, cursor: 'pointer', padding: 4 }}>
              <X size={18} />
            </button>
          </div>

          <textarea
            ref={textareaRef}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            placeholder="このノードへの気づきや返答を書き留める…"
            rows={5}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.05)',
              border: `1px solid ${draft ? theme.nodeAccent + '55' : theme.nodeBorder}`,
              borderRadius: 10, padding: '12px 14px',
              color: theme.nodeText, fontSize: 14, fontFamily: 'inherit',
              resize: 'none', outline: 'none', lineHeight: 1.6,
              transition: 'border-color 0.2s',
            }}
          />

          <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
            {node.note && (
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => { onSave(node.id, ''); onClose() }}
                style={{
                  background: 'transparent', border: '1px solid rgba(255,80,80,0.25)',
                  borderRadius: 10, padding: '10px 16px', color: 'rgba(255,100,100,0.7)',
                  fontSize: 13, cursor: 'pointer',
                }}
              >削除</motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { onSave(node.id, draft.trim()); onClose() }}
              style={{
                background: `${theme.nodeAccent}22`, border: `1px solid ${theme.nodeAccent}66`,
                borderRadius: 10, padding: '10px 20px', color: theme.nodeAccent,
                fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace',
              }}
            >保存</motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
