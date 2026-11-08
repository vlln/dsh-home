/**
 * 指针落在环的哪一段：按**角度**，不按图形命中。
 *
 * SVG 的弧只有描边能被指针命中，而指针大多数时候落在环洞里；按角度划分扇区之后，
 * 整个扇区都可触发，也省掉每段各挂一个 handler。0 在 12 点钟方向，顺时针增长。
 * 返回该段的 key；没有任何正值段时返回 null（不猜）。
 */
export function segmentAtPoint(
  segments: readonly { key: string; value: number }[],
  dx: number,
  dy: number,
): string | null {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  if (total <= 0) return null
  const angle = (((Math.atan2(dy, dx) + Math.PI / 2) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI) / (2 * Math.PI)
  let cursor = 0
  for (const segment of segments) {
    cursor += Math.max(0, segment.value) / total
    if (angle <= cursor) return segment.key
  }
  return null
}
