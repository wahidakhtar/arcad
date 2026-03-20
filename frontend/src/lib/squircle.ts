/**
 * Generate a squircle (superellipse) SVG path for use with clip-path: path().
 *
 * Unlike a standard border-radius (circular arc corners), a squircle has
 * bezier corners with control points very close to the corner vertex.
 * This means straight edges extend almost to the corner, then curve
 * quickly — matching the iOS icon / Apple design aesthetic.
 *
 * k = control point inset factor relative to r.
 * k=0  → sharp rectangle corners
 * k=0.1 → iOS squircle (tight, smooth)
 * k=0.552 → standard circular arc (same as CSS border-radius)
 */
export function squirclePath(w: number, h: number, r: number, k = 0.1): string {
  const c = r * k
  return [
    `M ${r} 0`,
    `L ${w - r} 0`,
    `C ${w - c} 0 ${w} ${c} ${w} ${r}`,
    `L ${w} ${h - r}`,
    `C ${w} ${h - c} ${w - c} ${h} ${w - r} ${h}`,
    `L ${r} ${h}`,
    `C ${c} ${h} 0 ${h - c} 0 ${h - r}`,
    `L 0 ${r}`,
    `C 0 ${c} ${c} 0 ${r} 0`,
    `Z`,
  ].join(" ")
}
