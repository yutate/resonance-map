export function Edge({ from, to, theme, isProvoked }) {
  if (!from || !to) return null
  const dx = to.x - from.x
  const cx1 = from.x + dx * 0.45
  const cx2 = from.x + dx * 0.55

  // 見やすい色: 通常は白系の柔らかいグレー、provokedは鮮やか
  const stroke = isProvoked
    ? theme.provokedBorder
    : theme.bg === '#04080f'
      ? 'rgba(140,170,255,0.55)'   // Business: 明るい青白
      : 'rgba(220,190,140,0.5)'    // Philosophy: 明るいアンバー

  return (
    <path
      d={`M${from.x},${from.y} C${cx1},${from.y} ${cx2},${to.y} ${to.x},${to.y}`}
      fill="none"
      stroke={stroke}
      strokeWidth={isProvoked ? 2.5 : 2}
      strokeDasharray={isProvoked ? '5 3' : undefined}
      strokeLinecap="round"
      opacity={isProvoked ? 0.9 : 1}
    />
  )
}
