"use client"

import { useEffect, useState } from "react"
import styles from "./proof.module.css"

type Props = {
  index: number
  total: number
  isActive: boolean
  value: number
  unit: string
  prefix: boolean
  eyebrow: string
  lead: string
  support: string
  source: string
}

export function ProofBeat(p: Props) {
  const [display, setDisplay] = useState(0)
  const [locked,  setLocked]  = useState(false)

  useEffect(() => {
    if (!p.isActive) {
      setDisplay(0)
      setLocked(false)
      return
    }

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) { setDisplay(p.value); setLocked(true); return }

    const start = performance.now()
    const D = 700
    const ease = (t: number) => 1 - Math.pow(1 - t, 3)
    let raf = 0
    let cancelled = false

    const step = (now: number) => {
      if (cancelled) return
      const t = Math.min(1, (now - start) / D)
      setDisplay(Math.round(p.value * ease(t)))
      if (t < 1) {
        raf = requestAnimationFrame(step)
      } else {
        setTimeout(() => { if (!cancelled) setLocked(true) }, 40)
      }
    }
    raf = requestAnimationFrame(step)
    return () => { cancelled = true; cancelAnimationFrame(raf) }
  }, [p.isActive, p.value])

  return (
    <article
      className={styles.beat}
      data-active={p.isActive ? "true" : "false"}
    >
      <header>
        <p className={styles.eyebrow}>
          {String(p.index + 1).padStart(2, "0")} / {String(p.total).padStart(2, "0")} ── {p.eyebrow}
        </p>
        <p className={styles.headline}>{p.lead}</p>
      </header>

      <div
        className={styles.hero}
        data-locked={locked ? "true" : "false"}
        aria-label={`${p.prefix ? p.unit : ""}${p.value}${p.prefix ? "" : p.unit}`}
      >
        {p.prefix && <span className={styles.heroUnit}>{p.unit}</span>}
        <span>{display}</span>
        {!p.prefix && <span className={styles.heroUnit}>{p.unit}</span>}
      </div>

      <footer>
        <p className={styles.support}>{p.support}</p>
        <p className={styles.source}>{p.source}</p>
      </footer>
    </article>
  )
}
