"use client"

import { useLocale } from "next-intl"
import { usePathname, useRouter } from "next/navigation"

export function LocaleSwitcher() {
  const locale   = useLocale()
  const pathname = usePathname()
  const router   = useRouter()

  const switchTo = (next: string) => {
    const segments = pathname.split("/")
    // segments[0] is "", segments[1] is the locale
    if (segments[1] === "ru" || segments[1] === "en") {
      segments[1] = next
    } else {
      segments.splice(1, 0, next)
    }
    router.push(segments.join("/") || "/")
  }

  return (
    <div className="flex items-center gap-1 font-mono text-xs select-none">
      <button
        onClick={() => switchTo("en")}
        className={locale === "en" ? "text-white" : "text-white/40 hover:text-white/70 transition-colors"}
        aria-label="Switch to English"
      >
        EN
      </button>
      <span className="text-white/20">|</span>
      <button
        onClick={() => switchTo("ru")}
        className={locale === "ru" ? "text-white" : "text-white/40 hover:text-white/70 transition-colors"}
        aria-label="Переключить на русский"
      >
        RU
      </button>
    </div>
  )
}
