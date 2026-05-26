"use client"

import { useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

const BEATS = [
  { id: "attention", value: 50,  unit: "ms", prefix: false },
  { id: "trust",     value: 75,  unit: "%",  prefix: false },
  { id: "cost",      value: 53,  unit: "%",  prefix: false },
  { id: "return",    value: 100, unit: "×",  prefix: true  },
] as const

type Beat = typeof BEATS[number]
type T    = ReturnType<typeof useTranslations>

function MobileBeat({ beat, index, total, isActive, t }: {
  beat: Beat; index: number; total: number; isActive: boolean; t: T
}) {
  const [display, setDisplay] = useState(0)
  const [locked,  setLocked]  = useState(false)

  useEffect(() => {
    if (!isActive) { setDisplay(0); setLocked(false); return }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) { setDisplay(beat.value); setLocked(true); return }

    const start = performance.now()
    const D = 700
    const ease = (x: number) => 1 - Math.pow(1 - x, 3)
    let raf = 0
    let cancelled = false

    const step = (now: number) => {
      if (cancelled) return
      const x = Math.min(1, (now - start) / D)
      setDisplay(Math.round(beat.value * ease(x)))
      if (x < 1) { raf = requestAnimationFrame(step) }
      else { setTimeout(() => { if (!cancelled) setLocked(true) }, 40) }
    }
    raf = requestAnimationFrame(step)
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  }, [isActive, beat.value])

  const brand     = "var(--brand)"
  const unitColor = locked
    ? "color-mix(in srgb, var(--brand) 70%, transparent)"
    : "rgba(255,255,255,0.55)"

  return (
    <div style={{
      scrollSnapAlign: "start",
      flexShrink:      0,
      width:           "100%",
      padding:         "48px 24px 32px",
      display:         "grid",
      gridTemplateRows: "auto 1fr auto",
      gap:             "28px",
    }}>
      {/* Eyebrow */}
      <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", margin: 0 }}>
        {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} ── {t(`beats.${beat.id}.eyebrow`)}
      </p>

      {/* Lead + big number */}
      <div>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "16px", letterSpacing: "0.04em", color: "rgba(255,255,255,0.6)", textTransform: "lowercase", margin: "0 0 20px" }}>
          {t(`beats.${beat.id}.lead`)}
        </p>
        <div style={{
          fontFamily:    "var(--font-mono)",
          fontSize:      "clamp(80px, 22vw, 140px)",
          lineHeight:    0.85,
          letterSpacing: "-0.04em",
          fontWeight:    500,
          color:         locked ? brand : "#fff",
          display:       "flex",
          alignItems:    "baseline",
          gap:           "0.05em",
          transition:    "color 240ms ease",
        }}>
          {beat.prefix && (
            <span style={{ fontSize: "0.28em", color: unitColor, transition: "color 240ms ease" }}>
              {beat.unit}
            </span>
          )}
          <span>{display}</span>
          {!beat.prefix && (
            <span style={{ fontSize: "0.28em", color: unitColor, transition: "color 240ms ease" }}>
              {beat.unit}
            </span>
          )}
        </div>
      </div>

      {/* Support + source */}
      <div>
        <p style={{ fontSize: "14px", lineHeight: 1.55, color: "rgba(255,255,255,0.72)", margin: "0 0 10px" }}>
          <span style={{ color: brand, marginRight: "0.4em" }}>─</span>
          {t(`beats.${beat.id}.support`)}
        </p>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", textTransform: "uppercase", margin: 0 }}>
          {t(`beats.${beat.id}.source`)}
        </p>
      </div>
    </div>
  )
}

export function MobileProof() {
  const t         = useTranslations("proof")
  const scrollRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      const idx = Math.round(el.scrollLeft / el.clientWidth)
      setActiveIndex(Math.max(0, Math.min(BEATS.length - 1, idx)))
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  return (
    <section style={{ background: "#000", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Hide webkit scrollbar inline via a scoped id */}
      <style>{`#mproof::-webkit-scrollbar{display:none}`}</style>

      <div
        id="mproof"
        ref={scrollRef}
        style={{
          display:                 "flex",
          overflowX:               "auto",
          scrollSnapType:          "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth:          "none",
          msOverflowStyle:         "none",
        } as React.CSSProperties}
      >
        {BEATS.map((beat, i) => (
          <MobileBeat
            key={beat.id}
            beat={beat}
            index={i}
            total={BEATS.length}
            isActive={i === activeIndex}
            t={t}
          />
        ))}
      </div>

      {/* Progress dots */}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", paddingBottom: "28px" }}>
        {BEATS.map((_, i) => (
          <button
            key={i}
            aria-label={`Slide ${i + 1}`}
            onClick={() => {
              const w = scrollRef.current?.clientWidth ?? 0
              scrollRef.current?.scrollTo({ left: i * w, behavior: "smooth" })
            }}
            style={{
              width:      i === activeIndex ? "24px" : "8px",
              height:     "8px",
              borderRadius: "999px",
              background: i === activeIndex ? "var(--brand)" : "rgba(255,255,255,0.2)",
              border:     "none",
              padding:    0,
              cursor:     "pointer",
              transition: "all 300ms ease",
              boxShadow:  i === activeIndex ? "0 0 8px var(--brand)" : "none",
            }}
          />
        ))}
      </div>
    </section>
  )
}
