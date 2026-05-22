import {
  SERVICES,
  RUSH_MULT,
  PARALLEL_WEEKS,
  TIER_LITE_MAX,
  TIER_EXTENDED_MIN,
} from "./pricing"

export type ScopeTier = "lite" | "standard" | "extended"

export interface AllocationItem {
  serviceId: string
  rawPrice: number
  price: number
  ratio: number
  tier: ScopeTier
  weeks: [number, number]
}

export interface EstimateResult {
  total: number
  weeks: [number, number]
  items: AllocationItem[]
  rush: boolean
}

export function computeEstimate(args: {
  selectedIds: string[]
  budget: number
  rush: boolean
}): EstimateResult {
  const { selectedIds, budget, rush } = args
  const selected = SERVICES.filter(s => selectedIds.includes(s.id))
  if (selected.length === 0) {
    return { total: 0, weeks: [0, 0], items: [], rush }
  }

  const pot  = rush ? budget * RUSH_MULT : budget
  const sumW = selected.reduce((acc, s) => acc + s.weight, 0)

  const items: AllocationItem[] = selected.map(s => {
    const rawPrice = pot * (s.weight / sumW)
    const ratio    = rawPrice / (s.weight * 1000)
    const tier: ScopeTier =
      ratio < TIER_LITE_MAX     ? "lite"
      : ratio > TIER_EXTENDED_MIN ? "extended"
      : "standard"

    const tierWeekMult = tier === "lite" ? 0.8 : tier === "extended" ? 1.2 : 1.0
    const rushWeekMult = rush ? 0.65 : 1.0
    const w0 = s.baseWeeks[0] * tierWeekMult * rushWeekMult
    const w1 = s.baseWeeks[1] * tierWeekMult * rushWeekMult

    return {
      serviceId: s.id,
      rawPrice,
      price: Math.round(rawPrice / 1000) * 1000,
      ratio,
      tier,
      weeks: [Math.max(1, Math.round(w0)), Math.max(1, Math.round(w1))],
    }
  })

  // Re-balance rounding so Σ items.price ≈ pot — adjust the largest item
  const sumPrices = items.reduce((acc, i) => acc + i.price, 0)
  const drift     = Math.round(pot / 1000) * 1000 - sumPrices
  if (drift !== 0 && items.length > 0) {
    const biggest = items.reduce((a, b) => (a.price >= b.price ? a : b))
    biggest.price += drift
  }

  // Weeks: parallel-adjusted max across all items
  const w0Total = Math.max(
    1,
    Math.round(items.reduce((a, i) => Math.max(a, i.weeks[0]), 0) * PARALLEL_WEEKS),
  )
  const w1Total = Math.max(
    1,
    Math.round(items.reduce((a, i) => Math.max(a, i.weeks[1]), 0) * PARALLEL_WEEKS),
  )

  return {
    total: items.reduce((acc, i) => acc + i.price, 0),
    weeks: [w0Total, w1Total],
    items,
    rush,
  }
}

export function tierLabelKey(tier: ScopeTier): string {
  return `calculator.tier.${tier}`
}
