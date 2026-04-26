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

// APIキーはランタイムで渡す（設定画面から）
let _apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY || ''

export function setApiKey(key) {
  _apiKey = key
}

export function getApiKey() {
  return _apiKey
}

export function hasApiKey() {
  return !!_apiKey && _apiKey.startsWith('sk-ant-')
}

export async function callClaude(nodeText, mode) {
  // APIキーなし → Stoicモードにフォールバック
  if (!hasApiKey()) {
    // 少し待つことでローディング感を出す
    await new Promise(r => setTimeout(r, 400 + Math.random() * 300))
    return stoicProvoke(mode)
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': _apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: SYSTEM_PROMPTS[mode],
      messages: [{ role: 'user', content: `Node topic: "${nodeText}"\nGenerate a provocation.` }],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    // APIエラー時もStoicにフォールバック
    console.warn('API error, falling back to stoic mode:', err?.error?.message)
    return stoicProvoke(mode)
  }

  const data = await res.json()
  const raw = data.content?.[0]?.text || '{}'
  const clean = raw.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}
