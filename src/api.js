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
  { id: 'claude-sonnet', label: 'Claude',  sub: 'Sonnet',        badge: null,   provider: 'anthropic' },
  { id: 'claude-haiku',  label: 'Claude',  sub: 'Haiku',         badge: '速い', provider: 'anthropic' },
  { id: 'gemini-flash',  label: 'Gemini',  sub: '2.5 Flash',     badge: null,   provider: 'google' },
  { id: 'gemini-lite',   label: 'Gemini',  sub: '2.5 Flash Lite',badge: '激安', provider: 'google' },
  { id: 'gpt-4o',        label: 'ChatGPT', sub: 'GPT-4o',        badge: null,   provider: 'openai' },
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
async function callAnthropic(modelId, systemPrompt, userPrompt, maxTokens = 256) {
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
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })
  if (!res.ok) throw new Error(`Anthropic ${res.status}`)
  const data = await res.json()
  return data.content?.[0]?.text || '{}'
}

async function callOpenAI(systemPrompt, userPrompt, maxTokens = 256) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${_state.openaiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: maxTokens,
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

async function callGemini(modelId, systemPrompt, userPrompt, maxTokens = 256) {
  const modelStr = modelId === 'gemini-lite'
    ? 'gemini-2.5-flash-lite-preview-06-17'
    : 'gemini-2.5-flash-preview-05-20'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${modelStr}:generateContent?key=${_state.geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userPrompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    }
  )
  if (!res.ok) throw new Error(`Gemini ${res.status}`)
  const data = await res.json()
  return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}'
}

async function callModel(modelId, systemPrompt, userPrompt, maxTokens = 256) {
  const m = MODELS.find(m => m.id === modelId)
  if (!m) throw new Error('Unknown model')
  if (m.provider === 'anthropic') return callAnthropic(modelId, systemPrompt, userPrompt, maxTokens)
  if (m.provider === 'openai') return callOpenAI(systemPrompt, userPrompt, maxTokens)
  if (m.provider === 'google') return callGemini(modelId, systemPrompt, userPrompt, maxTokens)
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

// ── Auto Expand ──
const AUTO_EXPAND_PROMPTS = {
  business: `You are a strategic mind map architect. Given a root theme, generate exactly 10 nodes that form a rich business mind map.
Structure:
- 3-4 depth-1 nodes: major strategic categories (e.g. Market, Operations, People, Innovation)
- 6-7 depth-2 nodes: concrete sub-topics under each category

Rules:
- depth-1 nodes: parent is "root"
- depth-2 nodes: parent is the exact text of a depth-1 node
- Be specific and actionable, not generic
- Use Japanese if the root theme is in Japanese
- Respond with ONLY a JSON array, no markdown:
[{"text":"node label","depth":1,"parent":"root"},{"text":"sub topic","depth":2,"parent":"parent node text"}]
- Exactly 10 items total`,

  philosophy: `You are a philosophical mind map architect. Given a root theme, generate exactly 10 nodes that form a deep philosophical mind map.
Structure:
- 3-4 depth-1 nodes: major conceptual axes (e.g. Ontology, Ethics, Epistemology, Paradox)
- 6-7 depth-2 nodes: specific questions or tensions under each axis

Rules:
- depth-1 nodes: parent is "root"
- depth-2 nodes: parent is the exact text of a depth-1 node
- Be provocative and intellectually challenging
- Use Japanese if the root theme is in Japanese
- Respond with ONLY a JSON array, no markdown:
[{"text":"concept","depth":1,"parent":"root"},{"text":"specific question","depth":2,"parent":"parent concept"}]
- Exactly 10 items total`,
}

export async function autoExpand(rootText, mode) {
  const key = keyForModel(_state.model)
  const systemPrompt = AUTO_EXPAND_PROMPTS[mode] || AUTO_EXPAND_PROMPTS.business
  const userPrompt = `Root theme: "${rootText}"\nGenerate 20 mind map nodes.`

  if (!key) {
    // Stoic fallback: generate dummy nodes
    const categories = mode === 'business'
      ? ['市場戦略', '組織・人材', 'オペレーション', 'イノベーション']
      : ['存在論', '倫理', '認識論', '言語と意味']
    const nodes = []
    categories.forEach((cat, i) => {
      nodes.push({ text: cat, depth: 1, parent: 'root' })
      const subs = mode === 'business'
        ? [`${cat}の競合優位`, `${cat}のKPI`, `${cat}のリスク`]
        : [`${cat}の核心的問い`, `${cat}の逆説`, `${cat}の限界`]
      subs.slice(0, i < 2 ? 3 : 2).forEach(s => nodes.push({ text: s, depth: 2, parent: cat }))
    })
    await new Promise(r => setTimeout(r, 600))
    return nodes.slice(0, 10)
  }

  try {
    const raw = await callModel(_state.model, systemPrompt, userPrompt, 600)
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) throw new Error('Not array')
    return parsed.slice(0, 10)
  } catch (err) {
    console.warn('Auto expand API error:', err)
    throw err
  }
}
