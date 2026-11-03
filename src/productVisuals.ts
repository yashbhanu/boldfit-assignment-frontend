// No product images in the API, so each SKU gets an emoji on a tinted tile
const VISUALS: Record<string, { emoji: string; tint: string }> = {
  'YOGA-MAT': { emoji: '🧘', tint: '#e9f3ff' },
  'RES-BANDS': { emoji: '💪', tint: '#fff1e6' },
  SHAKER: { emoji: '🥤', tint: '#eaf8ef' },
  'GYM-GLOVES': { emoji: '🧤', tint: '#f3edff' },
  'SKIP-ROPE': { emoji: '🪢', tint: '#fff6d6' },
}
const FALLBACK = { emoji: '🏋️', tint: '#f0f0ec' }

export function productVisual(sku: string) {
  return VISUALS[sku] ?? FALLBACK
}
