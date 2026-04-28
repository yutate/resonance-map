// ── LocalStorage map management ──
const LS_KEY = 'resonance-map:maps'
const LS_LAST = 'resonance-map:last'

function loadAll() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}') } catch { return {} }
}

function saveAll(maps) {
  localStorage.setItem(LS_KEY, JSON.stringify(maps))
}

export function listMaps() {
  const all = loadAll()
  return Object.entries(all)
    .map(([id, m]) => ({ id, name: m.name, savedAt: m.savedAt, nodeCount: m.nodes?.length || 0 }))
    .sort((a, b) => b.savedAt - a.savedAt)
}

export function saveMap(id, name, nodes, edges) {
  const all = loadAll()
  all[id] = { name, nodes, edges, savedAt: Date.now() }
  saveAll(all)
  localStorage.setItem(LS_LAST, id)
}

export function loadMap(id) {
  const all = loadAll()
  return all[id] || null
}

export function deleteMap(id) {
  const all = loadAll()
  delete all[id]
  saveAll(all)
  if (localStorage.getItem(LS_LAST) === id) localStorage.removeItem(LS_LAST)
}

export function getLastMapId() {
  return localStorage.getItem(LS_LAST) || null
}

export function renameMap(id, name) {
  const all = loadAll()
  if (all[id]) { all[id].name = name; saveAll(all) }
}

// ── JSON export / import ──
export function exportJSON(name, nodes, edges) {
  const blob = new Blob([JSON.stringify({ name, nodes, edges, exportedAt: Date.now() }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${name.replace(/\s+/g, '-')}.json`
  a.click()
}

// ── Think Drill → Resonance Map converter ──
function convertThinkDrill(data) {
  const trail = data.trail
  if (!Array.isArray(trail) || !trail.length) throw new Error('Invalid think-drill format')

  let nodeIdCounter = 1
  const nid = () => `td-n${nodeIdCounter++}`
  const eid = () => `td-e${nodeIdCounter++}`

  const nodes = []
  const edges = []

  // depth 0 = root
  const root = trail[0]
  const rootId = nid()
  nodes.push({
    id: rootId,
    text: root.question || '起点',
    x: 0, y: 0,
    isRoot: true,
    provoked: false, provokeData: null,
    collapsed: false, provokeCollapsed: false,
    note: '', parentId: null,
  })

  // Build chain: chosen path as main nodes
  let prevId = rootId
  let prevX = 0, prevY = 0
  const H_STEP = 240

  trail.slice(1).forEach((step, stepIdx) => {
    const chosenIdx = step.chosen !== null ? step.chosen : 0
    const candidates = step.candidates || []
    const chosenText = candidates[chosenIdx] || step.question || `深掘り ${stepIdx + 1}`

    // Main chosen node (larger, brighter)
    const chosenId = nid()
    const cx = prevX + H_STEP
    const cy = 0
    nodes.push({
      id: chosenId,
      text: chosenText,
      x: cx, y: cy,
      isRoot: false,
      provoked: false, provokeData: null,
      collapsed: false, provokeCollapsed: false,
      note: `選択された問い（depth ${step.depth}）`,
      parentId: prevId,
      colorKey: 'c2', // mint = chosen
    })
    edges.push({ id: eid(), from: prevId, to: chosenId })

    // Not-chosen candidates as faded branch nodes
    const notChosen = candidates.filter((_, i) => i !== chosenIdx)
    const spread = 90
    notChosen.forEach((cand, ci) => {
      const totalNC = notChosen.length
      const offsetY = (ci - (totalNC - 1) / 2) * spread
      const candId = nid()
      nodes.push({
        id: candId,
        text: cand,
        x: cx + 60, y: cy + offsetY + (offsetY >= 0 ? 80 : -80),
        isRoot: false,
        provoked: false, provokeData: null,
        collapsed: false, provokeCollapsed: false,
        note: '選ばれなかった候補',
        parentId: chosenId,
        colorKey: 'c5', // lavender = not chosen (faded)
      })
      edges.push({ id: eid(), from: chosenId, to: candId })
    })

    prevId = chosenId
    prevX = cx
    prevY = cy
  })

  return {
    name: `Think Drill: ${trail[0]?.question || '思考の軌跡'}`,
    nodes,
    edges,
  }
}

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)

        // Think Drill format detection
        if (data.trail && Array.isArray(data.trail)) {
          resolve(convertThinkDrill(data))
          return
        }

        // Standard Resonance Map format
        if (!data.nodes || !data.edges) throw new Error('Invalid format')
        resolve(data)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
