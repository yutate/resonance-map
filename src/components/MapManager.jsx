import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Plus, Trash2, Download, Upload, Pencil, Check, FolderOpen } from 'lucide-react'
import { listMaps, saveMap, loadMap, deleteMap, renameMap, exportJSON, importJSON } from '../storage.js'

function timeAgo(ts) {
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'たった今'
  if (s < 3600) return `${Math.floor(s / 60)}分前`
  if (s < 86400) return `${Math.floor(s / 3600)}時間前`
  return `${Math.floor(s / 86400)}日前`
}

export function MapManagerBtn({ theme, onOpen, mapName }) {
  return (
    <motion.button onClick={onOpen} whileTap={{ scale: 0.95 }}
      title="マップを管理"
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: 'rgba(255,255,255,0.05)',
        border: `1px solid ${theme.nodeBorder}`,
        borderRadius: 8, padding: '5px 10px',
        color: theme.nodeText, opacity: 0.7,
        fontSize: 10, cursor: 'pointer', fontFamily: 'monospace',
        letterSpacing: '0.06em', maxWidth: 130,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        transition: 'all 0.2s',
      }}
    >
      <FolderOpen size={10} />
      {mapName || 'UNTITLED'}
    </motion.button>
  )
}

export function MapManagerModal({ theme, currentMapId, currentName, nodes, edges, onLoad, onNew, onClose }) {
  const [maps, setMaps] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [saved, setSaved] = useState(false)
  const fileRef = useState(null)

  useEffect(() => { setMaps(listMaps()) }, [])

  const handleSaveCurrent = () => {
    saveMap(currentMapId, currentName, nodes, edges)
    setMaps(listMaps())
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  const handleLoad = (id) => {
    const m = loadMap(id)
    if (m) { onLoad(m); onClose() }
  }

  const handleDelete = (id, e) => {
    e.stopPropagation()
    if (confirm('このマップを削除しますか？')) {
      deleteMap(id)
      setMaps(listMaps())
    }
  }

  const handleRename = (id) => {
    renameMap(id, editName.trim() || '無題')
    setEditingId(null)
    setMaps(listMaps())
  }

  const handleExport = (e) => {
    e.stopPropagation()
    exportJSON(currentName, nodes, edges)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = await importJSON(file)
      onLoad(data)
      onClose()
    } catch { alert('読み込みに失敗しました') }
    e.target.value = ''
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
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
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            maxHeight: '85vh', display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <FolderOpen size={13} color={theme.nodeAccent} />
              <span style={{ fontSize: 13, fontWeight: 700, color: theme.nodeText, letterSpacing: '0.06em' }}>
                マップ管理
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', padding: 2 }}>
              <X size={16} />
            </button>
          </div>

          {/* Current map actions */}
          <div style={{
            padding: '12px 14px', marginBottom: 14,
            background: `${theme.nodeAccent}0e`,
            border: `1px solid ${theme.nodeAccent}33`,
            borderRadius: 10,
          }}>
            <div style={{ fontSize: 10, color: theme.nodeAccent, fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 6 }}>
              現在のマップ
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: theme.nodeText, marginBottom: 10 }}>
              {currentName}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleSaveCurrent}
                style={{
                  flex: 1, padding: '8px 0',
                  background: saved ? '#22c55e22' : `${theme.nodeAccent}22`,
                  border: `1px solid ${saved ? '#22c55e66' : theme.nodeAccent + '55'}`,
                  borderRadius: 8, color: saved ? '#22c55e' : theme.nodeAccent,
                  fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                {saved ? <><Check size={11} /> 保存済み</> : '💾 上書き保存'}
              </motion.button>
              <motion.button whileTap={{ scale: 0.96 }} onClick={handleExport}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${theme.nodeBorder}`,
                  borderRadius: 8, color: theme.nodeText, opacity: 0.7,
                  fontSize: 11, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                <Download size={11} /> JSON
              </motion.button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => { onNew(); onClose() }}
              style={{
                flex: 1, padding: '8px 0',
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid ${theme.nodeBorder}`,
                borderRadius: 8, color: theme.nodeText, opacity: 0.8,
                fontSize: 11, cursor: 'pointer', fontFamily: 'monospace',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
              }}>
              <Plus size={11} /> 新規マップ
            </motion.button>
            <label style={{ flex: 1 }}>
              <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              <motion.div whileTap={{ scale: 0.96 }}
                style={{
                  padding: '8px 0',
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${theme.nodeBorder}`,
                  borderRadius: 8, color: theme.nodeText, opacity: 0.8,
                  fontSize: 11, cursor: 'pointer', fontFamily: 'monospace',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                <Upload size={11} /> JSON読込
              </motion.div>
            </label>
          </div>

          {/* Map list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {maps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 12, color: theme.nodeText, opacity: 0.35, fontFamily: 'monospace' }}>
                保存済みマップなし
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {maps.map(m => (
                  <motion.div key={m.id} whileTap={{ scale: 0.98 }}
                    onClick={() => handleLoad(m.id)}
                    style={{
                      padding: '10px 14px',
                      background: m.id === currentMapId ? `${theme.nodeAccent}0e` : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${m.id === currentMapId ? theme.nodeAccent + '44' : theme.nodeBorder}`,
                      borderRadius: 9, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === m.id ? (
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onBlur={() => handleRename(m.id)}
                          onKeyDown={e => { if (e.key === 'Enter') handleRename(m.id); e.stopPropagation() }}
                          onClick={e => e.stopPropagation()}
                          autoFocus
                          style={{
                            background: 'transparent', border: 'none',
                            borderBottom: `1px solid ${theme.nodeAccent}`,
                            color: theme.nodeText, fontSize: 13, fontFamily: 'inherit',
                            outline: 'none', width: '100%',
                          }}
                        />
                      ) : (
                        <div style={{ fontSize: 13, fontWeight: 600, color: m.id === currentMapId ? theme.nodeAccent : theme.nodeText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name}
                        </div>
                      )}
                      <div style={{ fontSize: 10, color: theme.nodeText, opacity: 0.4, marginTop: 2, fontFamily: 'monospace' }}>
                        {m.nodeCount}ノード · {timeAgo(m.savedAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); setEditingId(m.id); setEditName(m.name) }}
                        style={{ background: 'none', border: 'none', color: theme.nodeText, opacity: 0.4, cursor: 'pointer', padding: 4 }}>
                        <Pencil size={11} />
                      </button>
                      <button onClick={e => handleDelete(m.id, e)}
                        style={{ background: 'none', border: 'none', color: 'rgba(255,80,80,0.5)', cursor: 'pointer', padding: 4 }}>
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
