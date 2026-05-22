export type ServiceCategory = "development" | "branding"

export interface Service {
  id: string
  category: ServiceCategory
  label: string
  weight: number
  baseWeeks: [number, number]
}

// Strategy: bottom-of-market aggregator (Fiverr-style).
// Each service has no fixed price — only a `weight` proportional to its target effort.
// Budget × (weight / Σweights) = per-service allocation; total ≡ budget (±rounding).
// Scope adapts to budget, not the other way around. Lite / Standard / Extended tier is
// surfaced to the user so the price-vs-scope relationship reads as honest, not magical.
// Floor: slider min = 5k. No per-service floor — accepted risk of the strategy.
export const SERVICES: Service[] = [
  // development
  { id: "landing",      category: "development", label: "лендинг",              weight:  32, baseWeeks: [2, 3]  },
  { id: "corporate",    category: "development", label: "корпоративный сайт",   weight:  69, baseWeeks: [4, 6]  },
  { id: "ecommerce",    category: "development", label: "интернет-магазин",     weight: 119, baseWeeks: [6, 10] },
  { id: "mobile",       category: "development", label: "мобильное приложение", weight: 239, baseWeeks: [8, 12] },
  // branding
  { id: "logo",         category: "branding",    label: "логотип",              weight:  15, baseWeeks: [1, 2]  },
  { id: "identity",     category: "branding",    label: "айдентика",            weight:  29, baseWeeks: [2, 3]  },
  { id: "brandbook",    category: "branding",    label: "брендбук",             weight:  49, baseWeeks: [3, 4]  },
  { id: "presentation", category: "branding",    label: "презентация",          weight:  16, baseWeeks: [1, 2]  },
  { id: "graphics",     category: "branding",    label: "графика",              weight:  10, baseWeeks: [1, 2]  },
  { id: "video",        category: "branding",    label: "видео",                weight:  32, baseWeeks: [2, 4]  },
]

export const BUDGET_MIN     = 5_000
export const BUDGET_MAX     = 2_000_000
export const BUDGET_STEP    = 1_000
export const RUSH_MULT      = 1.30
export const PARALLEL_WEEKS = 0.7

// Scope-tier thresholds based on (perServicePrice / (weight × 1000))
export const TIER_LITE_MAX     = 0.7  // ratio < 0.7  → lite scope
export const TIER_EXTENDED_MIN = 1.3  // ratio > 1.3  → extended scope

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽"
}
