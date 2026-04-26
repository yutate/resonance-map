import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, X, ExternalLink, Check } from 'lucide-react'
import { setApiKey, hasApiKey, getApiKey } from '../api.js'

export function ApiKeyBadge({ theme, onOpen }) {
  const active = hasApiKey()
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      title={active ? 'API接続済み — クリックで変更' : 'APIキーを設定してAIを有効化'}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: active ? `${theme.nodeAccent}18` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? theme.nodeAccent + '66' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 8, padding: '5px 10px',
        color: active ? theme.nodeAccent : 'rgba(255,255,255,0.4)',
        fontSize: 10, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.08em',
        transition: 'all 0.2s',
      }}
    >
      {active ? <Check size={10} /> : <Key size={10} />}
      {active ? 'AI ON' : 'STOIC'}
    </motion.button>
  )
}

export function ApiKeyModal({ theme, onClose }) {
  const [val, setVal] = useState(getApiKey())
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setApiKey(val.trim())
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 800)
  }

  const handleClear = () => {
    setVal('')
    setApiKey('')
    onClose()
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: theme.bg === '#04080f' ? '#080f1e' : '#1a1610',
            border: `1px solid ${theme.nodeBorder}`,
            borderRadius: 16, padding: '28px 28px 24px',
            width: 420, maxWidth: '90vw',
            boxShadow: `0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px ${theme.nodeBorder}`,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <Key size={14} color={theme.nodeAccent} />
                <span style={{ fontSize: 13, fontWeight: 700, color: theme.nodeText, letterSpacing: '0.06em' }}>
                  ANTHROPIC API KEY
                </span>
              </div>
              <div style={{ fontSize: 11, color: theme.nodeText, opacity: 0.45, lineHeight: 1.5 }}>
                未設定でも Stoic Mode（ローカル問いプール）で動作します
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 2 }}>
              <X size={16} />
            </button>
          </div>

          {/* Input */}
          <div style={{ marginBottom: 12 }}>
            <input
              value={val}
              onChange={e => setVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              placeholder="sk-ant-api03-..."
              type="password"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.06)',
                border: `1px solid ${val ? theme.nodeAccent + '55' : theme.nodeBorder}`,
                borderRadius: 9, padding: '10px 14px',
                color: theme.nodeText, fontSize: 13, fontFamily: 'monospace',
                outline: 'none', transition: 'border-color 0.2s',
              }}
            />
          </div>

          {/* Mode explanation */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20,
          }}>
            {[
              { label: 'STOIC MODE', desc: 'APIキー不要\n20問のローカル\nプロンプトプール', icon: '🌿', active: !val },
              { label: 'AI MODE', desc: 'APIキー必要\nClaude Sonnetが\nリアルタイム生成', icon: '⚡', active: !!val },
            ].map(m => (
              <div key={m.label} style={{
                padding: '10px 12px', borderRadius: 9,
                border: `1px solid ${m.active ? theme.nodeAccent + '55' : theme.nodeBorder}`,
                background: m.active ? `${theme.nodeAccent}0e` : 'transparent',
                transition: 'all 0.2s',
              }}>
                <div style={{ fontSize: 16, marginBottom: 4 }}>{m.icon}</div>
                <div style={{ fontSize: 10, fontWeight: 700, color: m.active ? theme.nodeAccent : theme.nodeText, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 4 }}>
                  {m.label}
                </div>
                <div style={{ fontSize: 10, color: theme.nodeText, opacity: 0.5, whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                  {m.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <motion.button
              onClick={handleSave} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              style={{
                flex: 1, padding: '9px 0',
                background: saved ? '#22c55e22' : `${theme.nodeAccent}22`,
                border: `1px solid ${saved ? '#22c55e88' : theme.nodeAccent + '88'}`,
                borderRadius: 9, color: saved ? '#22c55e' : theme.nodeAccent,
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
                fontFamily: 'monospace', letterSpacing: '0.08em',
                transition: 'all 0.2s',
              }}
            >
              {saved ? '✓ 保存しました' : val ? 'AI MODE で保存' : 'STOIC MODE で続ける'}
            </motion.button>
            {val && (
              <motion.button
                onClick={handleClear} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                style={{
                  padding: '9px 14px',
                  background: 'transparent', border: '1px solid rgba(255,80,80,0.25)',
                  borderRadius: 9, color: 'rgba(255,100,100,0.6)',
                  fontSize: 11, cursor: 'pointer', fontFamily: 'monospace',
                }}
              >
                クリア
              </motion.button>
            )}
          </div>

          {/* Link */}
          <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer"
            style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 14, fontSize: 10, color: theme.nodeAccent, opacity: 0.6, textDecoration: 'none' }}
          >
            <ExternalLink size={9} />
            console.anthropic.com でキーを取得
          </a>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
