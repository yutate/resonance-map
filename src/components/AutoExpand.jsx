import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Loader } from 'lucide-react'

// ── Trigger button in BottomSheet ──
export function AutoExpandBtn({ onClick, theme, loading }) {
  return (
    <motion.button
      onClick={onClick} disabled={loading}
      whileTap={{ scale: 0.95 }}
      style={{
        background: `linear-gradient(135deg, ${theme.nodeAccent}22, ${theme.provokedBorder}22)`,
        border: `1px solid ${theme.nodeAccent}55`,
        borderRadius: 12, padding: '12px 14px',
        color: theme.nodeAccent,
        cursor: loading ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 10,
        textAlign: 'left', opacity: loading ? 0.6 : 1,
        gridColumn: 'span 2', // full width in grid
        transition: 'all 0.15s',
      }}
    >
      <div style={{ flexShrink: 0 }}>
        {loading
          ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
          : <Sparkles size={16} />
        }
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace', letterSpacing: '0.06em' }}>
          {loading ? 'AUTO EXPANDING…' : 'AUTO EXPAND'}
        </div>
        <div style={{ fontSize: 10, opacity: 0.6, marginTop: 1 }}>
          AIが20ノードを一気に生成
        </div>
      </div>
    </motion.button>
  )
}

// ── Progress overlay while generating ──
export function AutoExpandOverlay({ theme, progress, total, nodeTexts }) {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 500,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: 32,
        }}
      >
        {/* Logo pulse */}
        <motion.div
          animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            width: 56, height: 56, borderRadius: '50%',
            background: `radial-gradient(circle, ${theme.nodeAccent}44, transparent)`,
            border: `1.5px solid ${theme.nodeAccent}66`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <Sparkles size={22} color={theme.nodeAccent} />
        </motion.div>

        <div style={{ fontSize: 13, fontWeight: 700, color: theme.nodeText, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 8 }}>
          AUTO EXPANDING
        </div>
        <div style={{ fontSize: 11, color: theme.nodeText, opacity: 0.45, marginBottom: 28, fontFamily: 'monospace' }}>
          AIがマップを構築中…
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', maxWidth: 300, marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: theme.nodeAccent, fontFamily: 'monospace' }}>
              {progress}/{total} nodes
            </span>
            <span style={{ fontSize: 10, color: theme.nodeText, opacity: 0.4, fontFamily: 'monospace' }}>
              {Math.round((progress / total) * 100)}%
            </span>
          </div>
          <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }}>
            <motion.div
              animate={{ width: `${(progress / total) * 100}%` }}
              transition={{ duration: 0.3 }}
              style={{
                height: '100%', borderRadius: 2,
                background: `linear-gradient(90deg, ${theme.nodeAccent}, ${theme.provokedBorder})`,
                boxShadow: `0 0 8px ${theme.nodeAccent}88`,
              }}
            />
          </div>
        </div>

        {/* Live node list */}
        <div style={{
          width: '100%', maxWidth: 300,
          maxHeight: 180, overflowY: 'auto',
          display: 'flex', flexDirection: 'column', gap: 4,
        }}>
          <AnimatePresence>
            {nodeTexts.map((t, i) => (
              <motion.div key={i}
                initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                style={{
                  fontSize: 12, color: theme.nodeText,
                  padding: '4px 10px',
                  background: 'rgba(255,255,255,0.04)',
                  borderRadius: 6,
                  borderLeft: `2px solid ${theme.nodeAccent}55`,
                  fontFamily: 'monospace',
                }}
              >
                {t}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
