import { motion } from 'framer-motion'

// 接続モード中のオーバーレイバナー
export function ConnectBanner({ fromNode, theme, onCancel }) {
  return (
    <motion.div
      initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
      exit={{ y: -60, opacity: 0 }}
      style={{
        position: 'fixed', top: 60, left: '50%', transform: 'translateX(-50%)',
        zIndex: 300,
        background: theme.bg === '#04080f' ? 'rgba(0,80,200,0.92)' : 'rgba(120,90,30,0.92)',
        border: `1px solid ${theme.nodeAccent}`,
        borderRadius: 12, padding: '10px 20px',
        display: 'flex', alignItems: 'center', gap: 12,
        backdropFilter: 'blur(12px)',
        boxShadow: `0 4px 20px rgba(0,0,0,0.4)`,
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ fontSize: 12, color: theme.nodeText, fontFamily: 'monospace' }}>
        <span style={{ color: theme.nodeAccent, fontWeight: 700 }}>{fromNode?.text}</span>
        <span style={{ opacity: 0.7 }}> → 接続先をタップ</span>
      </div>
      <motion.button
        whileTap={{ scale: 0.95 }} onClick={onCancel}
        style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 6, padding: '4px 10px', color: theme.nodeText, fontSize: 11, cursor: 'pointer', fontFamily: 'monospace' }}
      >キャンセル</motion.button>
    </motion.div>
  )
}
