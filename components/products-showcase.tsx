"use client"

import { useTranslations } from "next-intl"
import { PRODUCTS } from "@/lib/products"
import styles from "./products-showcase.module.css"

/**
 * Ниже этого числа лента не едет: крутить по кругу два логотипа выглядит
 * нелепо, поэтому они просто стоят по центру. Начиная с четырёх — марки
 * уезжают влево, как строка в шапке сайта.
 */
const MARQUEE_MIN = 4

interface ProductsShowcaseProps {
  /** Вариант для мобильной вёрстки: мельче логотипы, плотнее шаг. */
  compact?: boolean
}

export function ProductsShowcase({ compact = false }: ProductsShowcaseProps) {
  const t = useTranslations("products")

  const marquee = PRODUCTS.length >= MARQUEE_MIN
  // Лента едет на -50%, поэтому содержимое должно повторяться чётное число
  // раз — иначе на стыке будет рывок.
  const copies = marquee ? [0, 1, 2, 3] : [0]

  const logo = (p: (typeof PRODUCTS)[number], key: string) => {
    const name    = t(`items.${p.id}.name`)
    const tagline = t(`items.${p.id}.tagline`)

    const inner = (
      <>
        {/* Логотипы лежат в репозитории готовыми 256×256 webp; оптимизатор
            Next отключён в next.config.mjs, поэтому обычный img. */}
        <img
          className={styles.logo}
          src={p.logo}
          alt=""
          width={56}
          height={56}
          loading="lazy"
          decoding="async"
        />
        <span className={styles.name}>{name}</span>
      </>
    )

    return p.href ? (
      <a
        key={key}
        className={styles.item}
        href={p.href}
        target="_blank"
        rel="noopener noreferrer"
        title={tagline}
        aria-label={`${name} — ${tagline}`}
      >
        {inner}
      </a>
    ) : (
      <span key={key} className={styles.item} title={tagline} aria-label={`${name} — ${tagline}`}>
        {inner}
      </span>
    )
  }

  return (
    <div className={compact ? styles.rootCompact : styles.root}>
      <div className={styles.label}>{t("section_label")}</div>
      <h2 className={styles.title}>{t("title")}</h2>

      <div className={marquee ? styles.viewport : styles.viewportStatic}>
        <div className={marquee ? styles.track : styles.trackStatic}>
          {copies.map((c) =>
            PRODUCTS.map((p) => logo(p, `${c}-${p.id}`))
          )}
        </div>
      </div>
    </div>
  )
}
