export function Edge({ from, to, theme, isProvoked }) {
  if (!from || !to) return null
  const dx = to.x - from.x
  const cx1 = from.x + dx * 0.45
  const cx2 = from.x + dx * 0.55
  return (
    <path
      d={`M${from.x},${from.y} C${cx1},${from.y} ${cx2},${to.y} ${to.x},${to.y}`}
      fill="none"
      stroke={isProvoked ? theme.provokedBorder : theme.edgeColor}
      strokeWidth={isProvoked ? 1.5 : 1}
      strokeDasharray={isProvoked ? '4 3' : undefined}
      opacity={isProvoked ? 0.8 : 0.6}
    />
  )
}
