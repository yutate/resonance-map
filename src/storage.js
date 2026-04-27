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

export function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)
        if (!data.nodes || !data.edges) throw new Error('Invalid format')
        resolve(data)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsText(file)
  })
}
