"use client"

import { useEffect, useMemo, useRef } from "react"
import { useFrameSequence } from "./useFrameSequence"
import styles from "./service-card.module.css"

interface ServiceCardProps {
  label: string
  title: string
  description: string
  className?: string
  framePath: string
  totalFrames: number
  cardId: string
  hoveredCardId: string | null
  onHoverChange: (id: string | null) => void
}

export function ServiceCard({
  label,
  title,
  description,
  className = "",
  framePath,
  totalFrames,
  cardId,
  hoveredCardId,
  onHoverChange,
}: ServiceCardProps) {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const hoveringRef = useRef(false)

  const frameUrls = useMemo(() => {
    return Array.from({ length: totalFrames }, (_, i) =>
      `${framePath}${String(i + 1).padStart(3, "0")}.webp`
    )
  }, [framePath, totalFrames])

  const { index, ready, enter, leave, imagesRef } = useFrameSequence({ frameUrls })

  const isHovered      = hoveredCardId === cardId
  const isOtherHovered = hoveredCardId !== null && hoveredCardId !== cardId

  // React to isHovered changes (driven by overlay in page.tsx)
  useEffect(() => {
    if (isHovered) {
      hoveringRef.current = true
      enter()
    } else {
      hoveringRef.current = false
      leave()
    }
  }, [isHovered, enter, leave])

  // Draw current frame onto canvas
  useEffect(() => {
    if (!ready) return
    const img = imagesRef.current[index]
    if (!img || !img.complete || img.naturalWidth === 0) return
    const canvas = canvasRef.current
    if (!canvas) return
    if (canvas.width !== img.naturalWidth || canvas.height !== img.naturalHeight) {
      canvas.width  = img.naturalWidth
      canvas.height = img.naturalHeight
    }
    const ctx = canvas.getContext("2d")
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
  }, [index, ready, imagesRef])

  return (
    <div
      role="button"
      tabIndex={0}
      className={`${styles.card} ${className}`}
      data-hovered={String(isHovered)}
      data-other-hovered={String(isOtherHovered)}
      onFocus={() => { hoveringRef.current = true;  onHoverChange(cardId); enter() }}
      onBlur={() => { hoveringRef.current = false; onHoverChange(null);   leave() }}
    >
      {/* Preview */}
      <div className={styles.frames}>
        <canvas ref={canvasRef} className={styles.canvas} />
        {!ready && <div className={styles.placeholder} />}
      </div>

      {/* Text */}
      <div className={styles.text}>
        <span className={styles.label}>{label}</span>
        <h3 className={styles.title}>{title}</h3>
        <p className={styles.body}>{description}</p>
      </div>
    </div>
  )
}
