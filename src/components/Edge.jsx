// ── Edge with tap-to-delete hit area ──
export function Edge({ edgeId, from, to, theme, isProvoked, onDelete }) {
  if (!from || !to) return null
  const dx = to.x - from.x
  const cx1 = from.x + dx * 0.45
  const cx2 = from.x + dx * 0.55
  const d = `M${from.x},${from.y} C${cx1},${from.y} ${cx2},${to.y} ${to.x},${to.y}`

  const stroke = isProvoked
    ? theme.provokedBorder
    : theme.bg === '#04080f'
      ? 'rgba(140,170,255,0.55)'
      : 'rgba(220,190,140,0.5)'

  return (
    <g>
      {/* Visible edge */}
      <path
        d={d} fill="none"
        stroke={stroke}
        strokeWidth={isProvoked ? 2.5 : 2}
        strokeDasharray={isProvoked ? '5 3' : undefined}
        strokeLinecap="round"
        opacity={isProvoked ? 0.9 : 1}
        style={{ pointerEvents: 'none' }}
      />
      {/* Invisible wide hit area for tap */}
      {onDelete && (
        <path
          d={d} fill="none"
          stroke="transparent"
          strokeWidth={20}
          style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(edgeId)
          }}
        />
      )}
    </g>
  )
}

// ── Draft edge while dragging ──
export function DraftEdge({ from, to, theme }) {
  if (!from || !to) return null
  const dx = to.x - from.x
  const cx1 = from.x + dx * 0.45
  const cx2 = from.x + dx * 0.55
  return (
    <path
      d={`M${from.x},${from.y} C${cx1},${from.y} ${cx2},${to.y} ${to.x},${to.y}`}
      fill="none"
      stroke={theme.nodeAccent}
      strokeWidth={2}
      strokeDasharray="6 4"
      strokeLinecap="round"
      opacity={0.7}
      style={{ pointerEvents: 'none' }}
    />
  )
}
