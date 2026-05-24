"use client"

import { useTranslations } from "next-intl"
import styles from "./proof.module.css"
import { ProofBeat } from "./ProofBeat"

const BEATS = [
  { id: "attention", value: 50,  unit: "ms", prefix: false },
  { id: "trust",     value: 75,  unit: "%",  prefix: false },
  { id: "cost",      value: 53,  unit: "%",  prefix: false },
  { id: "return",    value: 100, unit: "×",  prefix: true  },
] as const

function ProgressRail({ active, total }: { active: number; total: number }) {
  return (
    <div className={styles.rail} aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={styles.railDot}
          data-on={i === active ? "true" : "false"}
        />
      ))}
    </div>
  )
}

interface ProofProps {
  /** 0..1 progress across the four beats (comes from scrollY in page.tsx) */
  progress: number
}

export function Proof({ progress }: ProofProps) {
  const t = useTranslations("proof")
  const activeIndex = Math.min(
    BEATS.length - 1,
    Math.floor(progress * BEATS.length)
  )
  const isLast = activeIndex === BEATS.length - 1

  return (
    <section id="proof" className={styles.stage} aria-label={t("aria")}>
      {BEATS.map((b, i) => (
        <ProofBeat
          key={b.id}
          index={i}
          total={BEATS.length}
          isActive={i === activeIndex}
          value={b.value}
          unit={b.unit}
          prefix={b.prefix}
          eyebrow={t(`beats.${b.id}.eyebrow`)}
          lead={t(`beats.${b.id}.lead`)}
          support={t(`beats.${b.id}.support`)}
          source={t(`beats.${b.id}.source`)}
        />
      ))}

      <div
        className={styles.bridge}
        aria-hidden={isLast ? "false" : "true"}
      >
        <p className={styles.bridgeText}>{t("bridge")}</p>
        <a href="#contact" className={styles.cta}>init.project →</a>
      </div>

      <ProgressRail active={activeIndex} total={BEATS.length} />
    </section>
  )
}
