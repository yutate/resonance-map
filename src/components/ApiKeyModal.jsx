import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Key, X, ExternalLink, Check } from 'lucide-react'
import { getState, setKeys, setModel, hasAnyKey, activeModelName, MODELS } from '../api.js'

// ── Model selector card (same style as media planner) ──
function ModelCard({ model, selected, hasKey, onClick, theme }) {
  const active = selected === model.id
  return (
    <motion.button
      onClick={() => onClick(model.id)}
      whileTap={{ scale: 0.97 }}
      style={{
        background: active ? `${theme.nodeAccent}18` : 'rgba(255,255,255,0.03)',
        border: `1.5px solid ${active ? theme.nodeAccent : theme.nodeBorder}`,
        borderRadius: 10, padding: '10px 12px',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'center', gap: 8,
        transition: 'all 0.15s',
      }}
    >
      {/* Dot indicator */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: active ? theme.nodeAccent : (hasKey ? '#22c55e' : theme.nodeBorder),
        boxShadow: active ? `0 0 6px ${theme.nodeAccent}` : 'none',
        transition: 'all 0.2s',
      }} />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: active ? theme.nodeAccent : theme.nodeText }}>
            {model.label}
          </span>
          <span style={{ fontSize: 11, color: active ? theme.nodeAccent : theme.nodeText, opacity: 0.6 }}>
            {model.sub}
          </span>
          {model.badge && (
            <span style={{
              fontSize: 9, padding: '1px 5px', borderRadius: 4,
              background: active ? `${theme.nodeAccent}33` : 'rgba(255,255,255,0.08)',
              color: active ? theme.nodeAccent : theme.nodeText,
              fontFamily: 'monospace', letterSpacing: '0.05em',
            }}>{model.badge}</span>
          )}
        </div>
        {!hasKey && (
          <div style={{ fontSize: 9, color: 'rgba(255,180,60,0.7)', marginTop: 1 }}>キー未設定</div>
        )}
      </div>
    </motion.button>
  )
}

// ── Key input row ──
function KeyInput({ label, placeholder, value, onChange, link, theme }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, color: theme.nodeText, opacity: 0.5, fontFamily: 'monospace', letterSpacing: '0.08em', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          type="password"
          style={{
            flex: 1, background: 'rgba(255,255,255,0.06)',
            border: `1px solid ${value ? theme.nodeAccent + '55' : theme.nodeBorder}`,
            borderRadius: 8, padding: '9px 12px',
            color: theme.nodeText, fontSize: 12, fontFamily: 'monospace',
            outline: 'none', transition: 'border-color 0.2s',
          }}
        />
        <a href={link} target="_blank" rel="noreferrer"
          style={{
            display: 'flex', alignItems: 'center', padding: '0 10px',
            background: 'rgba(255,255,255,0.04)', border: `1px solid ${theme.nodeBorder}`,
            borderRadius: 8, color: theme.nodeText, opacity: 0.5, textDecoration: 'none',
          }}>
          <ExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}

export function ApiKeyBadge({ theme, onOpen }) {
  const active = hasAnyKey()
  const label = active ? activeModelName() : 'STOIC'
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: active ? `${theme.nodeAccent}18` : 'rgba(255,255,255,0.05)',
        border: `1px solid ${active ? theme.nodeAccent + '66' : 'rgba(255,255,255,0.12)'}`,
        borderRadius: 8, padding: '5px 10px',
        color: active ? theme.nodeAccent : 'rgba(255,255,255,0.4)',
        fontSize: 10, cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '0.06em',
        transition: 'all 0.2s', maxWidth: 120,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
      }}
    >
      {active ? <Check size={10} /> : <Key size={10} />}
      {label}
    </motion.button>
  )
}

export function ApiKeyModal({ theme, onClose }) {
  const state = getState()
  const [selectedModel, setSelectedModel] = useState(state.model)
  const [anthropicKey, setAnthropicKey] = useState(state.anthropicKey)
  const [openaiKey, setOpenaiKey] = useState(state.openaiKey)
  const [geminiKey, setGeminiKey] = useState(state.geminiKey)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setModel(selectedModel)
    setKeys({ anthropicKey, openaiKey, geminiKey })
    setSaved(true)
    setTimeout(() => { setSaved(false); onClose() }, 700)
  }

  const hasKeyForModel = (id) => {
    const m = MODELS.find(m => m.id === id)
    if (!m) return false
    if (m.provider === 'anthropic') return !!anthropicKey
    if (m.provider === 'openai') return !!openaiKey
    if (m.provider === 'google') return !!geminiKey
    return false
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '16px',
        }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            background: theme.bg === '#04080f' ? '#080f1e' : '#1a1610',
            border: `1px solid ${theme.nodeBorder}`,
            borderRadius: 16, padding: '24px 20px 20px',
            width: '100%', maxWidth: 420,
            boxShadow: `0 24px 60px rgba(0,0,0,0.6)`,
            maxHeight: '90vh', overflowY: 'auto',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Key size={13} color={theme.nodeAccent} />
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.nodeText, letterSpacing: '0.06em' }}>
                使用する AI
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 2 }}>
              <X size={16} />
            </button>
          </div>

          {/* Model grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {MODELS.map(m => (
              <ModelCard
                key={m.id} model={m}
                selected={selectedModel}
                hasKey={hasKeyForModel(m.id)}
                onClick={setSelectedModel}
                theme={theme}
              />
            ))}
          </div>

          {/* Divider */}
          <div style={{ borderTop: `1px solid ${theme.nodeBorder}`, marginBottom: 16 }} />

          {/* Key inputs */}
          <KeyInput
            label="ANTHROPIC API KEY (Claude Sonnet / Haiku)"
            placeholder="sk-ant-api03-..."
            value={anthropicKey}
            onChange={setAnthropicKey}
            link="https://console.anthropic.com/settings/keys"
            theme={theme}
          />
          <KeyInput
            label="OPENAI API KEY (ChatGPT)"
            placeholder="sk-proj-..."
            value={openaiKey}
            onChange={setOpenaiKey}
            link="https://platform.openai.com/api-keys"
            theme={theme}
          />
          <KeyInput
            label="GOOGLE AI API KEY (Gemini)"
            placeholder="AIza..."
            value={geminiKey}
            onChange={setGeminiKey}
            link="https://aistudio.google.com/app/apikey"
            theme={theme}
          />

          {/* Stoic note */}
          <div style={{
            marginTop: 4, marginBottom: 16, padding: '8px 12px',
            background: 'rgba(255,255,255,0.03)', borderRadius: 8,
            border: `1px solid ${theme.nodeBorder}`,
            fontSize: 11, color: theme.nodeText, opacity: 0.5, lineHeight: 1.5,
          }}>
            🌿 キー未設定でも <strong style={{ color: theme.nodeText, opacity: 0.8 }}>Stoic Mode</strong>（ローカルプール）で動作します
          </div>

          {/* Save */}
          <motion.button
            onClick={handleSave} whileTap={{ scale: 0.97 }}
            style={{
              width: '100%', padding: '11px 0',
              background: saved ? '#22c55e22' : `${theme.nodeAccent}22`,
              border: `1px solid ${saved ? '#22c55e88' : theme.nodeAccent + '88'}`,
              borderRadius: 10, color: saved ? '#22c55e' : theme.nodeAccent,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'monospace', letterSpacing: '0.08em',
              transition: 'all 0.2s',
            }}
          >
            {saved ? '✓ 保存しました' : '保存'}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
