export type PriceMode = "fixed" | "quote"
export type ServiceCategory = "development" | "branding"

export interface Service {
  id: string
  category: ServiceCategory
  label: string
  basePrice: number       // used when priceMode === "fixed"
  pricePrefix: string     // "от" | "до" | ""
  priceMode: PriceMode
  baseWeeks: [number, number]
}

export const SERVICES: Service[] = [
  { id: "landing",      category: "development", label: "лендинг",              basePrice:  5_000, pricePrefix: "от", priceMode: "fixed", baseWeeks: [1, 3]  },
  { id: "corporate",    category: "development", label: "корпоративный сайт",   basePrice: 20_000, pricePrefix: "от", priceMode: "fixed", baseWeeks: [3, 6]  },
  { id: "ecommerce",    category: "development", label: "интернет-магазин",     basePrice: 30_000, pricePrefix: "от", priceMode: "fixed", baseWeeks: [4, 8]  },
  { id: "mobile",       category: "development", label: "мобильное приложение", basePrice: 10_000, pricePrefix: "от", priceMode: "fixed", baseWeeks: [6, 12] },
  { id: "logo",         category: "branding",    label: "логотип",              basePrice:  4_000, pricePrefix: "от", priceMode: "fixed", baseWeeks: [1, 2]  },
  { id: "identity",     category: "branding",    label: "айдентика",            basePrice:      0, pricePrefix: "",   priceMode: "quote", baseWeeks: [2, 4]  },
  { id: "brandbook",    category: "branding",    label: "брендбук",             basePrice:      0, pricePrefix: "",   priceMode: "quote", baseWeeks: [3, 5]  },
  { id: "presentation", category: "branding",    label: "презентация",          basePrice:      0, pricePrefix: "",   priceMode: "quote", baseWeeks: [1, 2]  },
  { id: "graphics",     category: "branding",    label: "графика",              basePrice:      0, pricePrefix: "",   priceMode: "quote", baseWeeks: [1, 3]  },
  { id: "video",        category: "branding",    label: "видео",                basePrice:      0, pricePrefix: "",   priceMode: "quote", baseWeeks: [2, 4]  },
]

export const BUDGET_MIN  = 5_000
export const BUDGET_MAX  = 500_000
export const BUDGET_STEP = 1_000

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("ru-RU").format(price) + " ₽"
}

export function formatServicePrice(service: Service): string {
  if (service.priceMode === "quote") return "—"
  const formatted = formatPrice(service.basePrice)
  return service.pricePrefix ? `${service.pricePrefix} ${formatted}` : formatted
}
