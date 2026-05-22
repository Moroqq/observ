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
  engagedCardId: string | null
  onEngageChange: (id: string | null) => void
}

export function ServiceCard({
  label,
  title,
  description,
  className = "",
  framePath,
  totalFrames,
  cardId,
  engagedCardId,
  onEngageChange,
}: ServiceCardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const frameUrls = useMemo(() => {
    return Array.from({ length: totalFrames }, (_, i) =>
      `${framePath}${String(i + 1).padStart(3, "0")}.png`
    )
  }, [framePath, totalFrames])

  const { index, ready, enter, leave, imagesRef } = useFrameSequence({ frameUrls })

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

  const isEngaged      = engagedCardId === cardId
  const isOtherEngaged = engagedCardId !== null && engagedCardId !== cardId

  // When frames finish loading and card is already engaged — start animation
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (ready && isEngaged) enter() }, [ready])

  // When card is disengaged — reverse animation back to frame 0
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (!isEngaged) leave() }, [isEngaged])

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={isEngaged}
      data-card-id={cardId}
      className={`${styles.card} ${className}`}
      data-engaged={String(isEngaged)}
      data-other-engaged={String(isOtherEngaged)}
      onClick={() => {
        if (!isEngaged) {
          onEngageChange(cardId)
          enter()
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !isEngaged) {
          e.preventDefault()
          onEngageChange(cardId)
          enter()
        }
        if (e.key === "Escape" && isEngaged) {
          onEngageChange(null)
        }
      }}
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
