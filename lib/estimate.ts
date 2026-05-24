import { SERVICES, type PriceMode } from "./pricing"

export interface AllocationItem {
  serviceId: string
  price: number
  priceMode: PriceMode
}

export interface EstimateResult {
  total:     number
  weeks:     [number, number]
  hasQuotes: boolean
  items:     AllocationItem[]
  rush:      boolean
}

export function computeEstimate(args: {
  selectedIds: string[]
  rush: boolean
}): EstimateResult | null {
  const { selectedIds, rush } = args
  const selected = SERVICES.filter(s => selectedIds.includes(s.id))
  if (selected.length === 0) return null

  const items: AllocationItem[] = selected.map(s => ({
    serviceId: s.id,
    price:     s.priceMode === "fixed" ? s.basePrice : 0,
    priceMode: s.priceMode,
  }))

  const total     = items.reduce((sum, i) => sum + i.price, 0)
  const hasQuotes = items.some(i => i.priceMode === "quote")

  const minWeeks = Math.max(...selected.map(s => s.baseWeeks[0]))
  const maxWeeks = Math.max(...selected.map(s => s.baseWeeks[1]))
  const weeks: [number, number] = rush
    ? [Math.max(1, Math.round(minWeeks * 0.7)), Math.max(2, Math.round(maxWeeks * 0.7))]
    : [minWeeks, maxWeeks]

  return { total, weeks, hasQuotes, items, rush }
}
