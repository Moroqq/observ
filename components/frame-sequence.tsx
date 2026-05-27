"use client"

import { useState, useEffect, useRef, useCallback } from "react"

interface FrameSequenceProps {
  totalFrames: number
  framePath: string
  frameExtension?: string
  className?: string
  style?: React.CSSProperties
  isPlaying?: boolean
  onPlayComplete?: () => void
  scrollControlled?: boolean
  loop?: boolean
}

export function FrameSequence({
  totalFrames,
  framePath,
  frameExtension = "webp",
  className = "",
  style,
  isPlaying = false,
  onPlayComplete,
  scrollControlled = false,
  loop = false,
}: FrameSequenceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)
  const [isLoaded, setIsLoaded] = useState(false)

  // Stable ref — never causes RAF loop to restart when parent re-renders
  const onPlayCompleteRef = useRef(onPlayComplete)
  onPlayCompleteRef.current = onPlayComplete

  const getFramePath = useCallback((index: number) => {
    const paddedIndex = String(index + 1).padStart(3, "0")
    return `${framePath}${paddedIndex}.${frameExtension}`
  }, [framePath, frameExtension])

  // Preload all frames; draw frame 0 the moment it loads
  useEffect(() => {
    const images: HTMLImageElement[] = []
    let loaded = 0

    for (let i = 0; i < totalFrames; i++) {
      const img = new Image()
      img.crossOrigin = "anonymous"
      img.src = getFramePath(i)

      img.onload = () => {
        loaded++
        if (i === 0) {
          const canvas = canvasRef.current
          const ctx = canvas?.getContext("2d")
          if (canvas && ctx) {
            canvas.width  = img.naturalWidth
            canvas.height = img.naturalHeight
            ctx.drawImage(img, 0, 0)
          }
        }
        if (loaded === totalFrames) setIsLoaded(true)
      }

      img.onerror = () => { loaded++ }
      images[i] = img
    }

    imagesRef.current = images
  }, [totalFrames, getFramePath])

  // Draw current frame on canvas
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const img = imagesRef.current[currentFrame]

    if (canvas && ctx && img && img.complete && img.naturalWidth > 0) {
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
  }, [currentFrame, isLoaded])

  // Persistent RAF loop — deps intentionally exclude onPlayComplete (stable via ref)
  // so scroll-triggered re-renders NEVER cancel or restart this loop.
  useEffect(() => {
    if (!isPlaying) return

    let frame = 0
    let lastTime = 0
    const frameInterval = 1000 / 30
    let rafId: number

    const animate = (timestamp: number) => {
      if (frame >= totalFrames) {
        if (loop) {
          frame = 0
        } else {
          onPlayCompleteRef.current?.()
          return
        }
      }
      if (timestamp - lastTime >= frameInterval) {
        setCurrentFrame(frame)
        frame++
        lastTime = timestamp
      }
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  }, [isPlaying, totalFrames, loop]) // onPlayComplete intentionally omitted — use ref instead

  // Scroll-controlled mode (only after loop=false playback finishes externally)
  useEffect(() => {
    if (!scrollControlled || !isLoaded) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight
      if (maxScroll <= 0) return
      const progress = Math.min(Math.max(scrollY / maxScroll, 0), 1)
      setCurrentFrame(Math.min(Math.floor(progress * totalFrames), totalFrames - 1))
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [scrollControlled, isLoaded, totalFrames])

  return <canvas ref={canvasRef} className={className} style={style} />
}
