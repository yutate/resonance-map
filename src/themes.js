export const BUSINESS_THEME = {
  bg: '#04080f',
  grid: 'rgba(0,120,255,0.04)',
  nodeBase: 'rgba(8,20,50,0.95)',
  nodeBorder: 'rgba(0,120,255,0.3)',
  nodeAccent: '#0078ff',
  nodeText: '#b8d4ff',
  provoked: 'rgba(0,180,255,0.12)',
  provokedBorder: 'rgba(0,220,255,0.6)',
  provokedText: '#00e5ff',
  edgeColor: 'rgba(0,100,200,0.35)',
  toggleBg: 'rgba(0,40,100,0.6)',
  shadow: '0 0 30px rgba(0,120,255,0.15)',
  provokedShadow: '0 0 25px rgba(0,220,255,0.3)',
  font: "system-ui, 'Helvetica Neue', sans-serif",
}

export const PHILOSOPHY_THEME = {
  bg: '#0e0c09',
  grid: 'rgba(180,150,100,0.04)',
  nodeBase: 'rgba(28,22,14,0.97)',
  nodeBorder: 'rgba(180,150,100,0.25)',
  nodeAccent: '#c8a96e',
  nodeText: '#d4c4a8',
  provoked: 'rgba(180,140,80,0.1)',
  provokedBorder: 'rgba(220,190,130,0.55)',
  provokedText: '#f0d890',
  edgeColor: 'rgba(150,120,70,0.3)',
  toggleBg: 'rgba(60,45,20,0.6)',
  shadow: '0 0 30px rgba(150,120,60,0.12)',
  provokedShadow: '0 0 25px rgba(200,169,110,0.25)',
  font: "Georgia, 'Times New Roman', serif",
}

const node = (id, text, parentId, x, y, colorIdx, isRoot = false) => ({
  id, text, parentId, x, y, colorIdx, isRoot,
  provoked: false, provokeData: null,
  collapsed: false, provokeCollapsed: false, note: '',
})

export const INITIAL_NODES = [
  node('n1', '中心テーマ',   null, 0,    0,    0, true),
  node('n2', 'ブランド戦略', 'n1', 280, -120, 1),
  node('n3', '顧客体験',     'n1', 280,  80,  2),
  node('n4', '組織文化',     'n1', -260, -80, 3),
  node('n5', '価値創造',     'n1', -240, 120, 4),
]

export const INITIAL_EDGES = [
  { id: 'e1', from: 'n1', to: 'n2' },
  { id: 'e2', from: 'n1', to: 'n3' },
  { id: 'e3', from: 'n1', to: 'n4' },
  { id: 'e4', from: 'n1', to: 'n5' },
]
