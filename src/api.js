import { stoicProvoke } from './stoic.js'

const SYSTEM_PROMPTS = {
  business: `You are a sharp strategic provocateur. Your job is to inject ONE disruptive question or keyword into a thinker's mind map node. Be concrete, market-focused, contrarian. Challenge assumptions with business logic, efficiency, or competitive framing.
Respond with ONLY a JSON object (no markdown, no explanation):
{"type": "question", "text": "...", "label": "2-4 word label"}
text: max 70 chars, in Japanese if the node text is Japanese.`,

  philosophy: `You are a philosophical provocateur. Your job is to inject ONE unsettling question or concept into a thinker's mind map node. Be abstract, ethical, existential. Challenge assumptions with ontological depth, paradox, or moral tension.
Respond with ONLY a JSON object (no markdown, no explanation):
{"type": "question", "text": "...", "label": "2-4 word label"}
text: max 70 chars, in Japanese if the node text is Japanese.`,
}

// ── State ──
let _state = {
  model: 'claude-sonnet',   // 'claude-sonnet' | 'claude-haiku' | 'gpt-4o' | 'gemini-flash'
  anthropicKey: import.meta.env.VITE_ANTHROPIC_API_KEY || '',
  openaiKey: '',
  geminiKey: '',
}

// ── Model definitions ──
export const MODELS = [
  { id: 'claude-sonnet', label: 'Claude', sub: 'Sonnet',  badge: null,    provider: 'anthropic' },
  { id: 'claude-haiku',  label: 'Claude', sub: 'Haiku',   badge: '速い',  provider: 'anthropic' },
  { id: 'gemini-flash',  label: 'Gemini', sub: '2.5 Flash', badge: null,  provider: 'google' },
  { id: 'gpt-4o',        label: 'ChatGPT', sub: 'GPT-4o', badge: null,    provider: 'openai' },
]

export function getState() { return { ..._state } }
export function getModel() { return _state.model }
export function setModel(m) { _state.model = m }
export function setKeys({ anthropicKey, openaiKey, geminiKey }) {
  if (anthropicKey !== undefined) _state.anthropicKey = anthropicKey
  if (openaiKey !== undefined) _state.openaiKey = openaiKey
  if (geminiKey !== undefined) _state.geminiKey = geminiKey
}

export function hasAnyKey() {
  return !!_state.anthropicKey || !!_state.openaiKey || !!_state.geminiKey
}

export function activeModelName() {
  const m = MODELS.find(m => m.id === _state.model)
  return m ? `${m.label} ${m.sub}` : 'STOIC'
}

function keyForModel(modelId) {
  const m = MODELS.find(m => m.id === modelId)
  if (!m) return ''
  if (m.provider === 'anthropic') return _state.anthropicKey
  if (m.provider === 'openai') return _state.openaiKey
  if (m.provider === 'google') return _state.geminiKey
  return ''
}

// ── Callers ──
async function callAnthropic(modelId, systemPrompt, userPrompt) {
  const modelStr = modelId === 'claude-haiku'
    ? 'claude-haiku-4-5-20251001'
    : 'claude-sonnet-4-20250514'

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': _state.anthropicKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: modelStr,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || '{}'
}

async function callOpenAI(systemPrompt, userPrompt) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${_state.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 256,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })
  if (!res.ok) throw new Error(`OpenAI ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || '{}'
}

async function callGemini(systemPrompt, userPrompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${_state.geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: 256 },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
}

async function callModel(modelId, systemPrompt, userPrompt) {
  const m = MODELS.find(m => m.id === modelId)
  if (!m) throw new Error('Unknown model')
  if (m.provider === 'anthropic') return callAnthropic(modelId, systemPrompt, userPrompt)
  if (m.provider === 'openai') return callOpenAI(systemPrompt, userPrompt)
  if (m.provider === 'google') return callGemini(systemPrompt, userPrompt)
  throw new Error('Unknown provider')
}

// ── Public callClaude (name kept for compatibility) ──
export async function callClaude(nodeText, thinkingMode) {
  const key = keyForModel(_state.model)
  if (!key) {
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
    return stoicProvoke(thinkingMode)
  }

  const systemPrompt = SYSTEM_PROMPTS[thinkingMode]
  const userPrompt = `Node topic: "${nodeText}"\nGenerate a provocation.`

  try {
    const raw = await callModel(_state.model, systemPrompt, userPrompt)
    const clean = raw.replace(/```json|```/g, '').trim()
    return JSON.parse(clean)
  } catch (err) {
    console.warn('API error, falling back to stoic:', err.message)
    return stoicProvoke(thinkingMode)
  }
}

// Legacy compat
export function setApiKey(key) { _state.anthropicKey = key }
export function getApiKey() { return _state.anthropicKey }
export function hasApiKey() { return hasAnyKey() }
